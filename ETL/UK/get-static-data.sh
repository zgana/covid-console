#!/bin/sh

# TODO: set pwd appropriately

# get topojson
if [ ! -f topo_eer.json ]; then
    wget -nc https://martinjc.github.io/UK-GeoJSON/json/eng/topo_eer.json
    cp topo_eer.json topo_eer.orig.json
fi

# "simplify" topojson for smoother plotting
toposimplify -P .1 -o topo_eer.json   topo_eer.orig.json

