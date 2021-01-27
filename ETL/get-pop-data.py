import requests

import numpy as np
import pandas as pd


# get population data
print('Downloading US Census population data...')
x = pd.read_csv('https://www2.census.gov/programs-surveys/popest/datasets/2010-2019/counties/totals/'
                'co-est2019-alldata.csv', encoding='latin1')

pop = x['STNAME CTYNAME STATE COUNTY POPESTIMATE2019'.split()]
pop = pop.rename(columns={
    'STATE': 'fips_state',
    'COUNTY': 'fips_county',
    'STNAME':'state_name',
    'CTYNAME':'county_name',
    'POPESTIMATE2019': 'population'
})


# get fips data
print('Downloading US Census FIPS mapping...')
fips = pd.read_excel('https://www2.census.gov/programs-surveys/popest/geographies/2019/'
                     'all-geocodes-v2019.xlsx', skiprows=4)
fips.columns = 'fips_summary fips_state fips_county fips_county_sub fips_place fips_city name'.split()
fips = fips[
    fips.fips_place.eq(0)
    & fips.fips_county_sub.eq(0)
    & fips.fips_place.eq(0)
    & fips.fips_city.eq(0)
]
fips['fips'] = [f'{s:d}{c:03d}' for(s,c) in zip(fips.fips_state, fips.fips_county)]
fips['fips'] = fips.fips.astype(int)

# get land area data
# https://www.census.gov/library/publications/2011/compendia/usa-counties-2011.html
print('Downloading US Census land area survey...')
url = 'https://www2.census.gov/library/publications/2011/compendia/usa-counties/excel/LND01.xls'
headers = {
    "User-Agent":
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/50.0.2661.75 Safari/537.36",
    "X-Requested-With": "XMLHttpRequest"
}
r = requests.get(url, headers=headers)
land = pd.read_excel(r.content)
#land = pd.read_excel('https://www2.census.gov/library/publications/'
#                     '2011/compendia/usa-counties/excel/LND01.xls')
land = pd.DataFrame(dict(fips=land.STCOU, land_area=land.LND010190D))


# join and save
pop = pop.merge(fips['fips fips_state fips_county'.split()],
                on='fips_state fips_county'.split())
pop = pop.merge(land, on='fips')
pop = pop['fips fips_state fips_county state_name county_name population land_area'.split()]
pop['population_density'] = np.where(pop.land_area, pop.population / pop.land_area, np.nan)

# compute population-weighted density
pop_states = pop[pop.fips_county.eq(0)].copy()
pop_states['state_population'] = pop_states.population
pop_counties = pop[pop.fips_county.ne(0)]
pop_counties = pop_counties.merge(pop_states['fips_state state_population'.split()], on='fips_state')
pop_counties['population_weighted_density'] = (
    pop_counties.population / pop_counties.state_population * pop_counties.population_density
)
pop_w_density = pop_counties.groupby('fips_state', as_index=False).population_weighted_density.sum()
pop_states = pop_states.merge(pop_w_density, on='fips_state')
pop = pop.merge(pop_states['fips population_weighted_density'.split()],
                on='fips', how='left')
idx = pop.fips_county.ne(0)
pop.loc[idx, 'population_weighted_density'] = pop.loc[idx, 'population_density']


outfile = 'data/pop/pop-estimates-2019.csv'
print(f'Writing {outfile} ...')
pop.to_csv(outfile, index=False)


