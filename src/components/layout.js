import React from 'react'
import { configure as configureHotKeys } from 'react-hotkeys'

import SEO from './seo'
import Header from './header'
import Footer from './footer'

import styles from './layout.css'

export default function Layout({ children }) {

  configureHotKeys({
    ignoreTags: [],
  })

  styles || console.log(styles)
  return (
    <>
      <SEO />
      <div
        style={{
          position: `relative`,
          margin: `3rem auto`,
          marginTop: `0`,
          minWidth: `500px`,
          maxWidth: `800px`,
          padding: `0 1rem`
        }}>
        <Header />
        {children}
        <Footer />
      </div>
    </>
  )
}
