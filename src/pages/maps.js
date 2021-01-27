import React  from "react"
import Layout from "../components/layout.js"
import CovidMapBlock from "../components/charts/covid-map.js"

export default function Maps(props) {
  return (
    <Layout>
      <h1>maps</h1>
      <CovidMapBlock
        location={props.location}
      />
    </Layout>
  )
}
