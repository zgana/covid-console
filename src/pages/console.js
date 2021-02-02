import React from 'react'
import { Link } from 'gatsby'

import Layout from '../components/layout'
import Notebook from '../components/notebook'


export default function Home() {
  return (
    <Layout>
      <h1>console</h1>
      <p>
        New here?  Try typing "help" below.
      </p>
      <Notebook />
      {/* <Roadmap /> */}
    </Layout>
  )
}
