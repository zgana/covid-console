#!/usr/bin/env python3

import pandas as pd

wiki_table = pd.read_html('https://en.wikipedia.org/wiki/List_of_U.S._state_abbreviations', skiprows=9)[0]

abbreviations = pd.DataFrame(dict(
    state=wiki_table['ANSI'],
    state_name=wiki_table['Name and status of region'])).dropna()

abbreviations.to_csv('data/geo/state_name_mapping.csv', index=False)
