#!/usr/bin/env python3

# adapted from:
# https://colab.research.google.com/github/hikmahealth/covid19countymap/blob/master/notebooks/export_GeoJSON_counties.ipynb

import io
import copy
import json
import urllib.request
import xml.dom.minidom
import zipfile

import kml2geojson
import lxml.etree

def parse_broken_kml(contents):
    fixing_tree = lxml.etree.fromstring(
        contents, parser=lxml.etree.XMLParser(recover=True))
    tree = xml.dom.minidom.parseString(lxml.etree.tostring(fixing_tree))
    return kml2geojson.build_layers(tree)

def read_2018_census_kml(filename):
    url = "https://www2.census.gov/geo/tiger/GENZ2018/kml/" + filename + ".zip"
    with urllib.request.urlopen(url) as infile:
        buffer = io.BytesIO(infile.read())
    return zipfile.ZipFile(buffer).read(filename + ".kml")

sizestrs = ['20m']
for sizestr in sizestrs:

    raw_counties = parse_broken_kml(read_2018_census_kml(f'cb_2018_us_county_{sizestr}'))[0]

    counties = copy.deepcopy(raw_counties)
    for entry in counties['features']:
        props = entry['properties']
        props.pop('ALAND')
        props.pop('AWATER')
        props.pop('COUNTYFP')
        props.pop('COUNTYNS')
        props['fips_id'] = int(props.pop('GEOID'))
        props.pop('LSAD')
        props['name'] = props.pop('NAME')
        props['state_id'] = int(props.pop('STATEFP'))
        props.pop('description')
        props.pop('styleUrl')
        props['is_a_state'] = False

    outfile = f'data/geo/counties_{sizestr}.json'
    print(f'Writing {outfile} ...')
    with open(outfile, 'w') as outfile:
        json.dump(counties, outfile)
