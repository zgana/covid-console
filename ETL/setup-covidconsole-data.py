#!/usr/bin/env python

import os

import numpy as np
import pandas as pd

def tidy_data(data):
    keys = (
        'date days id'
        ' deaths positives hospital hospital_currently vaccinations full_vaccinations'
        ' new_deaths_weekly new_positives_weekly new_hospital_weekly new_vaccinations_weekly new_full_vaccinations_weekly'
        ' new_deaths_stl new_positives_stl new_hospital_stl new_vaccinations_stl new_full_vaccinations_stl'
        .split()
    )
    keys = [key for key in keys if key in data.columns]
    D = data[keys].copy()
    D['days'] = D.days - D.days.max()
    return D.sort_values('days id'.split())


ETL_DIR = os.path.split(os.path.abspath(__file__))[0]
APP_DIR = os.path.split(ETL_DIR)[0]
DATA_DIR = f'{APP_DIR}/static/data'



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
