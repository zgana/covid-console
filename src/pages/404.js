import React  from "react"
import Layout from "../components/layout.js"

export default function Error404(props) {
  return (
    <Layout>
      <h1>404</h1>
      <>
        The requested URL was not found on this server.
      </>
    </Layout>
  )
}

