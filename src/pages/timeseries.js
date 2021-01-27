import React  from "react"
import Layout from "../components/layout.js"
import CovidTimeseriesBlock from "../components/charts/covid-timeseries.js"

export default function Timeseries(props) {
  return (
    <Layout>
      <h1>timeseries</h1>
      <CovidTimeseriesBlock
        location={props.location}
      />
    </Layout>
  )
}
