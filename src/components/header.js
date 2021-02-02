import React from "react"
import { Link, useStaticQuery, graphql } from "gatsby"

const ListLink = (props) => {
  return (
    <li style={{ display: `inline-block`, marginRight: `1rem` }} >
      <Link to={props.to} style={{ color: "MidnightBlue" }}>
        {props.children}
      </Link>
    </li>
  )
}

export default function Header() {
  const data = useStaticQuery(graphql`
      query {
        site {
          siteMetadata {
            title
          }
        }
      }
    `
  )
  return (
    <header
      style={{
        backgroundColor: `SteelBlue`,
      }}>
      <div
        style={{
          margin: `0 auto`,
          padding: `.5rem`,
          display: "flex",
          alignItems: "center",
        }}
      >
        <Link to="/"
          style={{
            textShadow: `none`,
            backgroundImage: `none`,
            textDecoration: `none`,
            display: "flex",
            alignItems: "center",
          }}>
          <img src="/logo32.png" alt="covid-19 structure (from CDC)"
            style={{ display: "inline", margin: 0 }}
          />
          <h3 style={{ display: `inline`, margin: 0, marginLeft: ".2rem" }}>
            {data.site.siteMetadata.title}
          </h3>
        </Link>
        <ul style={{ listStyle: `none`, float: `right`, margin: 0, marginLeft: `auto`}}>
          <ListLink to="/">home</ListLink>
          <ListLink to="/console/">console</ListLink>
          <ListLink to="/about/">about</ListLink>
          {/* <ListLink to="/test">test</ListLink> */}
        </ul>
      </div>
    </header>
  )
}

