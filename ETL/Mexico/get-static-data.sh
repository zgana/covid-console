#!/bin/sh

# TODO: set pwd appropriately

# get topojson
# TODO: is there a better source??
# https://github.com/topojson/topojson/issues/310#issuecomment-320111158
wget -nc https://github.com/topojson/topojson/files/1198799/mx.json.zip
echo 'y' | unzip mx.json.zip

# "simplify" topojson for smoother plotting
cp mx.json mx.orig.json
toposimplify -P .01 -o mx.json   mx.orig.json


