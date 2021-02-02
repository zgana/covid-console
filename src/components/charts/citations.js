import React from 'react'

import useLoad from '../data'


const Citation = (props) => {
  const { source, isLast } = props

  return (
    <span
      style={{
        display: `inline-block`,
        padding: `0 .2em`,
      }}
    >
      <a href={source.url} target="_blank" rel="noopener noreferrer">{source.name}</a>
      { isLast ? '' : ',' }
    </span>
  )
}


export default function Citations(props) {
  const dataSpec = props.dataSpec
  const { SOURCES } = useLoad(dataSpec)

  const style = {
    fontSize: `.75em`,
    textAlign: `right`,
    width: `95%`,
    height: `.75em`,
  }

  if (!SOURCES) {
    return (
      <div style={style} >
      </div>
    )
  }

  const numSources = SOURCES.length

  return (
    <>
      <div style={style} >
        {numSources === 1 ? 'Source:' : 'Sources:'}

        {Object.keys(SOURCES).map(i => (
          <Citation key={i} source={SOURCES[i]} isLast={parseInt(i) === numSources - 1} />
        ))}
      </div>
    </>
  )
}
