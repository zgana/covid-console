import React from 'react'
import { Link } from 'gatsby'

import Layout from '../components/layout'
// import Abbrev from '../components/abbrev'
import Notebook from '../components/notebook'
// import Roadmap from '../components/roadmap'

export default function Home() {
  return (
    <Layout>
      <h1>console</h1>
      <p>
        This interface is in early development.  For standalone interactive charts, see <Link to='/maps/'>maps</Link> or <Link to='/timeseries/'>timeseries charts</Link>.  Or, try typing "help" below.
      </p>
      <Notebook />
      {/* <Roadmap /> */}
    </Layout>
  )
}
