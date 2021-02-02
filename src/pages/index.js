import React, { useState } from 'react'

import Layout from '../components/layout'
import CovidMapBlock from "../components/charts/covid-map.js"
import CovidTimeseriesBlock from "../components/charts/covid-timeseries.js"

import { allDataSpecs } from '../components/data'
import DataSpecSelector from '../components/charts/data-spec-selector.js'

export default function Home(props) {

  const defaultDataSpec = allDataSpecs[0]
  const [dataSpec, setDataSpec] = useState(defaultDataSpec)

  return (
    <Layout>
      <DataSpecSelector dataSpec={dataSpec} setDataSpec={setDataSpec} />
      <CovidMapBlock location={props.location} dataSpec={dataSpec} />
      <CovidTimeseriesBlock location={props.location} dataSpec={dataSpec} />
    </Layout>
  )
}
