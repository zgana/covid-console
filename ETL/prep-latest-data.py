#!/usr/bin/env python

import os

import numpy as np
import pandas as pd

import statsmodels.api as sm

from tqdm import tqdm

ETL_DIR = os.path.split(os.path.abspath(__file__))[0]

def get_world_data():
    print('Downloading world country-level data from OurWorldInData ...')
    raw_world = pd.read_csv('https://covid.ourworldindata.org/data/owid-covid-data.csv',
                            parse_dates=['date'])
    world = (
        raw_world
        .query('iso_code.notna()')
        .rename(columns={
            'total_cases': 'positives',
            'total_deaths': 'deaths',
            'hosp_patients': 'hospital_currently',
            'total_tests': 'tests',
            'people_vaccinated': 'vaccinations',
            'people_fully_vaccinated': 'full_vaccinations',
        })
    )
    world['land_area'] = world.population / world.population_density * 2.58999
    # patch some where owid is missing data
    # values from wikipedia
    world.loc[world.location.eq('South Sudan'), 'land_area'] = 239285
    world.loc[world.location.eq('Syria'), 'land_area'] = 71500
    world.loc[world.location.eq('Taiwan'), 'land_area'] = 13976
    world.loc[world.location.eq('Vatican'), 'land_area'] = 0.19
    world['days'] = world.date.map({d:i for (i,d) in enumerate(np.unique(world.date.values))})
    world = world[world.date.lt(world.date.max())]
    return world

def get_state_data(pop, state_name_mapping):
    print('Downloading state-level data from covidtracking.com ...')

    x = pd.read_csv('https://covidtracking.com/data/download/all-states-history.csv',
                    parse_dates=['date'])
    v = pd.read_csv('https://github.com/owid/covid-19-data/raw/master/public/data/vaccinations/us_state_vaccinations.csv',
                    parse_dates=['date'])
    v = v.rename(columns={
        'location': 'state_name',
        'people_vaccinated': 'vaccinations',
        'people_fully_vaccinated': 'full_vaccinations',
    })
    data = x['date state death positive negative recovered dataQualityGrade'
             ' hospitalized hospitalizedCurrently inIcuCumulative inIcuCurrently'
             ' onVentilatorCumulative onVentilatorCurrently'
             ' totalTestResults'
             .split()]
    data = data[~data.date.isna()]
    data = data.sort_values('date state'.split(), ascending=True).reset_index(drop=True)
    data['datestr'] = data['date'].astype(str)
    data['days'] = data.date.map({d:i for (i,d) in enumerate(np.unique(data.date.values))})

    # rename columns
    data.columns = [
        'date',
        'state',
        'deaths',
        'positives',
        'negatives',
        'recoveries',
        'data_quality',
        'hospital',
        'hospital_currently',
        'icu',
        'icu_currently',
        'ventilator',
        'ventilator_currently',
        'tests',
        'datestr',
        'days',
    ]

    # set up pop data for state-level
    pop = pop[pop.fips_county.eq(0)]
    pop = pop['state_name population land_area population_density population_weighted_density'.split()]
    pop = pop.merge(state_name_mapping, on='state_name')

    data = (
        data
        .merge(pop, on='state')
        .merge(v['state_name date vaccinations full_vaccinations'.split()], on='state_name date'.split())
    )

    return data

def get_county_data(pop):

    print('Downloading county-level data from NYTimes github ...')

    data = pd.read_csv('https://github.com/nytimes/covid-19-data/blob/master/us-counties.csv?raw=true')

    # won't try to join data without fips code
    data = data[~data.fips.isna()]

    data['fips'] = data.fips.astype(int)
    data['datestr'] = data.date.astype(str)
    data['date'] = pd.to_datetime(data.date)
    data['days'] = data.date.map({d:i for (i,d) in enumerate(np.unique(data.date.values))})

    data = data.rename(columns={'cases':'positives', 'county':'county_name', 'state':'state_name'})
    data = data[[
        'date',
        'state_name',
        'county_name',
        'fips',
        'deaths',
        'positives',
        'datestr',
        'days',
    ]]

    pop = pop[pop.fips_county.ne(0)]
    pop = pop['fips population land_area population_density'.split()]
    data = data.merge(pop, on='fips')

    return data

def augment_timeseries(data, id_col):
    print('Augmenting...')
    d = data
    if 'negatives' in d.columns and 'tests' not in d.columns:
        d['tests'] = d.positives + d.negatives
    columns = (
        'deaths positives negatives tests hospital icu ventilator hospital_currently'
        ' vaccinations full_vaccinations'.split()
    )
    for col in tqdm(columns):
        if col not in d.columns:
            continue
        pivot = d.pivot('date', id_col, col).fillna(method='ffill').fillna(0)
        melted = pivot.reset_index().melt(['date'], var_name=id_col, value_name=col)
        d = d.drop(columns=col).merge(melted, how='left')
        if 'currently' in col:
            continue
        dpivot = pivot.diff().fillna(0)
        melted = dpivot.reset_index().melt(['date'], var_name=id_col, value_name=f'new_{col}')
        d = d.merge(melted, how='left')
        melted = pivot.diff(7).fillna(0).reset_index().melt(['date'], var_name=id_col, value_name=f'new_{col}_weekly')
        d = d.merge(melted, how='left')
        stls = pd.DataFrame({c: sm.tsa.STL(dpivot[c]).fit().trend for c in dpivot.columns}).reset_index()
        melted = stls.melt(['date'], var_name=id_col, value_name=f'new_{col}_stl')
        d = d.merge(melted, how='left')

    for suffix in ['', '_stl', '_weekly']:
        for col in columns:
            if col not in d.columns:
                continue
            c = f'new_{col}{suffix}'
            if c in d.columns:
                d[c] = d[c].clip(0).round(1)
            
    columns = (
        'positives deaths hospital hospital_currently'
        ' vaccinations full_vaccinations'.split()
    )
    for key in columns:
        if key in d.columns:
            d[key] = d[key].fillna(0, downcast='infer')

    return d


outfile = f'{ETL_DIR}/data/latest/covid19-latest-world.csv'
data = get_world_data()
data = augment_timeseries(data, 'iso_code')
print(f'Writing {outfile} ...')
data.to_csv(outfile, index=False)

state_name_mapping = pd.read_csv(f'{ETL_DIR}/data/geo/state_name_mapping.csv')
pop = pd.read_csv(f'{ETL_DIR}/data/pop/pop-estimates-2019.csv')

data = get_state_data(pop, state_name_mapping)
data = augment_timeseries(data, 'state')
outfile = f'{ETL_DIR}/data/latest/covid19-latest-state.csv'
print(f'Writing {outfile} ...')
data.to_csv(outfile, index=False)

data = get_county_data(pop)
data = augment_timeseries(data, 'fips')
outfile = f'{ETL_DIR}/data/latest/covid19-latest-county.csv'
print(f'Writing {outfile} ...')
data.to_csv(outfile, index=False)
