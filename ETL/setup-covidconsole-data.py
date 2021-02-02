#!/usr/bin/env python

import json
import os
import shutil

import numpy as np
import pandas as pd

def tidy_data(data):
    keys = (
        'date days id'
        ' deaths positives hospital hospital_currently vaccinations full_vaccinations'
        # ' new_deaths_weekly new_positives_weekly new_hospital_weekly new_vaccinations_weekly new_full_vaccinations_weekly'
        ' new_deaths_stl new_positives_stl new_hospital_stl'
        #' new_vaccinations_stl new_full_vaccinations_stl'
        ' new_vaccinations new_full_vaccinations'
        .split()
    )
    keys = [key for key in keys if key in data.columns]
    D = data[keys].copy()
    D['days'] = D.days - D.days.max()
    return D.sort_values('days id'.split())


ETL_DIR = os.path.split(os.path.abspath(__file__))[0]
APP_DIR = os.path.split(ETL_DIR)[0]
DATA_DIR = f'{APP_DIR}/static/data'



def Mexico():
    data = pd.read_csv(f'{ETL_DIR}/data/latest/Mexico-covid19-latest-state.csv', parse_dates=['date'])
    META = data['id name population'.split()].drop_duplicates().reset_index(drop=True)
    SOURCES = [
        dict(name='Gobierno de México',
             url='https://datos.covid-19.conacyt.mx/')
    ]
    data = tidy_data(data.drop(columns='name population'.split()))
    data_dir = f'{DATA_DIR}/Mexico/state'
    os.makedirs(data_dir, exist_ok=True)
    print(f'Writing to {data_dir} ...')
    data.to_csv(f'{data_dir}/data.csv', index=False)
    META.to_csv(f'{data_dir}/META.csv', index=False)
    with open(f'{data_dir}/SOURCES.json', 'wt') as f:
        json.dump(SOURCES, f)

    # also need to bring geo
    # https://github.com/topojson/topojson/issues/310#issuecomment-320111158
    # https://github.com/topojson/topojson/files/1198799/mx.json.zip
    shutil.copyfile(f'{ETL_DIR}/Mexico/mx.json', f'{DATA_DIR}/Mexico/topo.json')


def UK():
    data = pd.read_csv(f'{ETL_DIR}/data/latest/UK-covid19-latest-region.csv', parse_dates=['date'])
    data['name_lower'] = data.name.str.lower()
    META = pd.read_html('https://en.wikipedia.org/wiki/Regions_of_England')[4]
    META = META[META.columns[:4]]
    META.columns = 'name population change area'.split()
    META['name_lower'] = META.name.str.lower()
    META['land_area'] = (
        META.area
        .str.replace('.*\(', '')
        .str.replace('[^\d]', '')
    )
    META = (
        META
        .drop(columns='change area'.split())
        .merge(data['id name_lower'.split()].drop_duplicates())
        .drop(columns='name_lower')
    )
    SOURCES = [
        dict(name='Public Health England',
             url='https://coronavirus.data.gov.uk/details/download')
    ]

    data = tidy_data(data.drop(columns='name'.split()))
    data_dir = f'{DATA_DIR}/UK/region'
    os.makedirs(data_dir, exist_ok=True)
    print(f'Writing to {data_dir} ...')
    data.to_csv(f'{data_dir}/data.csv', index=False)
    META.to_csv(f'{data_dir}/META.csv', index=False)
    with open(f'{data_dir}/SOURCES.json', 'wt') as f:
        json.dump(SOURCES, f)

    # also need to bring geo
    # https://martinjc.github.io/UK-GeoJSON/
    shutil.copyfile(f'{ETL_DIR}/UK/topo_eer.json', f'{DATA_DIR}/UK/topo.json')



Mexico()
UK()


world = pd.read_csv(f'{ETL_DIR}/data/latest/covid19-latest-world.csv', parse_dates=['date'])
world_codes = pd.read_html('https://www.iban.com/country-codes')[0]
world_codes_map = dict(zip(world_codes['Alpha-3 code'], world_codes['Numeric']))
world['id'] = world.iso_code.map(world_codes_map)
wD = tidy_data(world[world.date.lt(world.date.max())])
wD = wD[wD.id.notna()]
wmd = (world['id iso_code location continent population land_area'.split()][world.id.notna()]
       .rename(columns={'location':'name'})
       .drop_duplicates())
wmd['population'] = wmd.population.astype(int)

data_dir = f'{DATA_DIR}/World/country'
os.makedirs(data_dir, exist_ok=True)
print(f'Writing to {data_dir} ...')
wD.to_csv(f'{data_dir}/data.csv', index=False)
wmd.to_csv(f'{data_dir}/META.csv', index=False)
w_sources = [
    dict(name='Our World In Data',
         url='https://github.com/owid/covid-19-data/tree/master/public/data/')
]
with open(f'{data_dir}/SOURCES.json', 'wt') as f:
    json.dump(w_sources, f)



sdata = pd.read_csv(f'{ETL_DIR}/data/latest/covid19-latest-state.csv', parse_dates=['date'])
cdata = pd.read_csv(f'{ETL_DIR}/data/latest/covid19-latest-county.csv', parse_dates=['date'])
cdata = cdata.rename(columns={'fips':'id'})

statenames = sdata['state state_name'.split()].drop_duplicates().sort_values('state_name')
statenames.head()

cD = tidy_data(cdata)
d1, d2 = cD.days.min(), cD.days.max()
cDrecent = cD[cD.days.gt(d1 + (d2 - d1) * .75)]
cmd = (cdata['id county_name state_name population land_area'.split()]
       .merge(statenames)
       .drop_duplicates()
       .sort_values('id')
      )
cmd['name'] = cmd.county_name + ', ' + cmd.state

data_dir = f'{DATA_DIR}/USA/county'
os.makedirs(data_dir, exist_ok=True)
print(f'Writing to {data_dir} ...')
cD.to_csv(f'{data_dir}/data.csv', index=False)
cDrecent.to_csv(f'{data_dir}/data-recent.csv', index=False)
cmd.to_csv(f'{data_dir}/META.csv', index=False)
c_sources = [
    dict(name='The New York Times',
         url='https://github.com/nytimes/covid-19-data')
]
with open(f'{data_dir}/SOURCES.json', 'wt') as f:
    json.dump(c_sources, f)

# obnoxiously coupled to `cmd`; desperately needs to be refactored
statefips = (
    cmd.assign(id = (cmd.id / 1000).astype(int))
    ['id state_name'.split()]
    .drop_duplicates().sort_values('state_name')
)

sD = tidy_data(sdata.merge(statefips))
smd = (sdata['state_name state population land_area'.split()]
       .drop_duplicates()
       .merge(statefips)
       .rename(columns={'state_name':'name'}))

data_dir = f'{DATA_DIR}/USA/state'
os.makedirs(data_dir, exist_ok=True)
print(f'Writing to {data_dir} ...')
sD.to_csv(f'{data_dir}/data.csv', index=False)
smd.to_csv(f'{data_dir}/META.csv', index=False)
s_sources = [
    dict(name='The COVID Tracking Project',
         url='https://covidtracking.com/'),
    dict(name='Our World In Data',
         url='https://github.com/owid/covid-19-data/tree/master/public/data/vaccinations/'),
]
with open(f'{data_dir}/SOURCES.json', 'wt') as f:
    json.dump(s_sources, f)
