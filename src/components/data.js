import useSWR from 'swr'
import * as d3 from 'd3'


const IN_DEV = process.env.NODE_ENV === 'development'


const isNumber = (n) => {
  return !isNaN(parseFloat(n)) && !isNaN(n - 0)
}


const geoFetch = geoURL => d3.json(geoURL)
  .then(geo => {
    for (let key of Object.keys(geo.objects)) {
      for (let g of geo.objects[key].geometries) {
        g.id = +g.id
      }
    }
    return geo
  })

const dataFetch = spec => {
  const filename = (spec === 'USA/county' && IN_DEV) ? 'data-recent.csv' : 'data.csv'
  return d3.csv(`/data/${spec}/${filename}`)
    .then((data) => {
      const statNames = Object.keys(data[0]).filter(stat => !['days','id', 'date'].includes(stat))
      data.forEach((d) => {
        // d.date = d.date
        d.days = +d.days
        d.id = isNumber(d.id) ? +d.id : d.id
        for (const stat of statNames) {
          d[stat] = +d[stat]
        }
      })

      const uDays = new Set(data.map(d => d.days))
      var cdata = {}
      var dd = {}
      for (const day of uDays) {
        cdata[day] = {}
        const dayData = data.filter(d => d.days === day)
        dd[day] = dayData[0].date
        for (var row of dayData) {
          cdata[day][row.id] = row
        }
      }

      const minDay = d3.min(uDays)
      const maxDay = d3.max(uDays)

      return {
        uniqueDays: [...uDays].sort(),
        minDay: minDay,
        maxDay: maxDay,
        nDays: maxDay - minDay,
        data: cdata,
        daysDates: dd,
        statNames: statNames,
      }
    })
}

// const dataFetch = spec => {
//   if (spec.includes('county')) {
//     return dataFetchCounty(spec)
//   }
// }

const metaFetch = spec => {
  return d3.csv(spec)
    .then((data) => {
      data.forEach((d) => {
        d.id = isNumber(d.id) ? +d.id : d.id
        d.population = 1.0 * (+d.population)
        d.land_area = 1.0 * (+d.land_area)
      })

      var META = {}
      data.forEach(d => (META[d.id] = d))
      return META
    })
}

const specToGeopath = (spec) => {
  if (spec.includes('USA')) {
    return 'https://cdn.jsdelivr.net/npm/us-atlas@3/counties-albers-10m.json'
  }
  else if (spec.includes('World')) {
    return 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'
  }
  return '/DoesNotExist'
}

const specToMetapath = (spec) => {
  return '/data/' + spec + '/META.csv'
}

const specToSourcespath = (spec) => {
  return '/data/' + spec + '/SOURCES.json'
}

const specToGeoFeatures = (spec) => {
  if (spec.includes('county')) {
    return ['counties', ['nation', 'states', 'counties']]
  }
  else if (spec.includes('state')) {
    return ['states', ['nation', 'states', 'counties']]
  }
  else if (spec.includes('country')) {
    return ['countries', ['land', 'countries']]
  }
}

const specToProjection = (spec) => {
  if (spec.includes('country')) {
    return d3.geoNaturalEarth1()
  }
  else {
    return null
  }
}

const geoFeatureToMetaToName = (geoFeature) => {
  return m => m.name
  // var metaToName;
  // switch (geoFeature) {
  //   case 'counties':
  //     metaToName = m => `${m.county_name}, ${m.state_name}`
  //     break;
  //   case 'states':
  //     metaToName = m => m.state_name
  //     break;
  //   case 'countries':
  //     metaToName = m => m.country_name
  //     break;
  //   default:
  //     metaToName = m => '(error)'
  //     break;
  // }
  // return metaToName
}

const useLoad = (spec) => {
  const geopath = specToGeopath(spec)
  const metapath = specToMetapath(spec)
  const sourcespath = specToSourcespath(spec)
  const geoFeatures = specToGeoFeatures(spec)
  const projection = specToProjection(spec)
  const metaToName = geoFeatureToMetaToName(geoFeatures[0])

  const {data: geometry, error: geometryError} = useSWR(geopath, geoFetch)
  const {data: META, error: METAError} = useSWR(metapath, metaFetch)
  const {data: DATA, error: DATAError} = useSWR(spec, dataFetch)
  const {data: SOURCES, error: SOURCESError} = useSWR(sourcespath, d3.json)

  return {
    geometry, DATA, META, SOURCES, metaToName, geoFeatures, projection,
    geometryError, DATAError, METAError, SOURCESError }
}

export default useLoad

const statLabels = {
  positives: "Cumulative positives",
  deaths: "Cumulative deaths",
  hospital: "Cumulative hospitalizations",
  new_positives_weekly: "Weekly new positives",
  new_deaths_weekly: "Weekly new deaths",
  new_hospital_weekly: "Weekly new hospitalizations",
  new_positives_stl: "Daily new positives (smoothed)",
  new_deaths_stl: "Daily new deaths (smoothed)",
  new_hospital_stl: "Daily new hospitalizations (smoothed)",
  hospital_currently: "Hospitalized currently",
  vaccinations: "Cumulative vaccinations",
  full_vaccinations: "Cumulative full vaccinations",
  new_vaccinations_weekly: "Weekly new vaccinations",
  new_full_vaccinations_weekly: "Weekly new full vaccinations",
  new_vaccinations_stl: "Daily new vacc. (smoothed)",
  new_full_vaccinations_stl: "Daily new full vacc. (smoothed)",
}

const normLabels = {
  "one": "",
  "population": "per person",
  "land_area": "per square mile"
}

const allDataSpecs = [
  'World/country',
  'USA/state',
  'USA/county',
]


export { allDataSpecs, statLabels, normLabels }
