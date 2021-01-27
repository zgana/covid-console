#!/bin/sh

mkdir -p data/geo
mkdir -p data/pop
mkdir -p data/latest

pop_url='https://www2.census.gov/programs-surveys/popest/datasets/2010-2019/counties/totals/'
pop_filename='co-est2019-alldata.csv'
wget -nc $pop_url/$pop_filename -O data/pop/$pop_filename

geo_state_url='https://github.com/python-visualization/folium/raw/master/tests/us-states.json'
wget -nc $geo_state_url -O data/geo/us-states.json

python3 get-state-name-mapping.py
python3 get-county-data.py
python3 get-pop-data.py
