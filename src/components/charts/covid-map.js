// components/libs
import React from 'react'
import Slider, { createSliderWithTooltip } from 'rc-slider'
import 'rc-slider/assets/index.css'
import { Tooltip } from "react-svg-tooltip"
// import queryString from 'query-string'
import * as d3 from 'd3'
import * as topojson from "topojson-client"

// hooks
import { useState, useMemo, useRef, useCallback } from 'react'
import useInterval from '@use-it/interval'

// site
import Loading from '../loading'
import styles from './covid-charts.module.css'
import useLoad, { statLabels, normLabels, isNumber } from '../data'
import Citations from './citations.js'


const SliderWithTooltip = createSliderWithTooltip(Slider)


const MapPatch = (props) => {

  const ref = React.createRef()
  const {
    g, iMETA, metaToName,
    getPath, value,
    colorScale, maxY,
    width, height,
    ready,
  } = props

  const p = useMemo(() => {
    return getPath(g)
  }, [g, getPath])

  const [x, y] = useMemo(() => {
    return getPath.centroid(g)
  }, [g, getPath])

  if (! (g && iMETA && value)) {
    return ( <> </> )
  }

  const tipWidth = 250
  const tipHeight = 95
  const tipX = x < width/2 ? 25 : -(25 + 250)
  const tipY = y < height/2 ? 0 : -tipHeight
  const tipXtext = tipX + 20
  const tipFontSize=18

  const id = g.id

  const tipLocationLabel = metaToName(iMETA)
  // var tipLocationLabel = '(error)'
  // switch (geoFeature) {
  //   case 'counties':
  //     tipLocationLabel = `${iMETA.county_name}, ${iMETA.state_name}`
  //     break;
  //   case 'states':
  //     tipLocationLabel = iMETA.state_name
  //     break;
  //   case 'countries':
  //     tipLocationLabel = iMETA.country_name
  //     break;
  //   default:
  //     tipLocationLabel = '(error)'
  //     break;
  // }

  return (
    <g>
      <path
        ref={ref}
        strokeWidth="0"
        d={p}
        fill={value === '-' ? '#eee' : colorScale(Math.min(maxY,value))}
        title={id}
      ></path>        
      {ready
        ? (
          <Tooltip triggerRef={ref} >
            <rect
              x={tipX} y={tipY}
              rx={10} ry={10}
              width={tipWidth} height={tipHeight}
              fill='#222' opacity="67%"
            />
            <text x={tipXtext} y={tipY} dy={1.5*tipFontSize} fill="white" fontSize={tipFontSize}>
              {value < 1 ? value.toPrecision(3) : value}
            </text>
            <text x={tipXtext} y={tipY} dy={3*tipFontSize} fill="white" fontSize={tipFontSize}>
              {tipLocationLabel}
            </text>
            <text x={tipXtext} y={tipY} dy={4*tipFontSize} fill="white" fontSize={tipFontSize}>
              Population {iMETA.population}
            </text>
          </Tooltip>
        )
        :
          null
      }
    </g>
  )
}


const CovidMap = (props) => {

  const ref = useRef()

  const dataSpec = props.dataSpec
  const { geometry, DATA, META, metaToName, geoFeatures, projection } = useLoad(dataSpec)
  const { day, stat, plotNorm, plotLog } = props

  const geoFeature = geoFeatures[0]
  const indicateFeatures = geoFeatures[1]

  const extractValue = useCallback(
    (d) => {
      const value = d[stat]
      var norm = 1
      if (plotNorm === "population") {
        norm = META[d.id].population
      }
      else if (plotNorm === "land_area") {
        norm = Math.max(META[d.id].land_area, 1)
      }
      return value / norm
    },
    [plotNorm, META, stat]
  )

  const minPosY = useMemo(() => {
    if (!DATA) {
      return 0
    }
    const data = DATA.data
    var vals = []
    for (const iday of Object.keys(data)) {
      for (const iid of Object.keys(data[iday])) {
        const val = extractValue(data[iday][iid])
        if (val > 0) {
          vals.push(val)
        }
      }
    }
    return d3.min(vals)
  }, [DATA, extractValue])

  const maxY = useMemo(() => {
    if (!DATA) {
      return 0
    }
    var vals = []
    for (const iday of Object.keys(DATA.data)) {
      for (const iid of Object.keys(DATA.data[iday])) {
        const val = extractValue(DATA.data[iday][iid])
        if (val) {
          vals.push(val)
        }
      }
    }
    var sortVals = vals.sort((a,b) => a - b)
    const idx = Math.floor(.975 * (sortVals.length - 1))
    const m = sortVals[idx]
    return m > minPosY ? m : sortVals[sortVals.length - 1]
  }, [DATA, minPosY, extractValue])

  const linColorScale = useMemo(() => {
    return d3.scaleSequential(d3.interpolateBlues).domain([0, maxY])
  }, [maxY])
  const logColorScale = useMemo(() => {
    return d3.scaleSequentialLog(d3.interpolateBlues).domain([minPosY, maxY])
  }, [minPosY, maxY])

  const colorScale = plotLog ? logColorScale : linColorScale


  const width = 975

  const scaledProjection = useMemo(() => {
    if (geometry && indicateFeatures && projection) {
      const feat = topojson.feature(geometry, geometry.objects[indicateFeatures[0]])
      return projection.fitSize([width,width/2], feat)
    }
    else {
      return null
    }
  }, [geometry, projection, indicateFeatures])

  const path = useMemo(() => {
    return scaledProjection ? d3.geoPath(scaledProjection) : d3.geoPath()
  }, [scaledProjection])

  const colorbarHeight = 30

  const height = useMemo(() => {
    if (scaledProjection) {
      var outline
      if (dataSpec.includes('World')) {
        outline = {type: 'Sphere'}
      }
      else {
        outline = topojson.feature(geometry, geometry.objects[indicateFeatures[0]])
      }
      const bounds = path.bounds(outline)
      const [y0, y1] = [bounds[0][1], bounds[1][1]]
      return Math.ceil(Math.abs(y1 - y0))
    }
    else {
      return 610
    }
  }, [dataSpec, geometry, indicateFeatures, scaledProjection, path])

  const svgGeometry = `0 0 ${width} ${height + colorbarHeight}`

  const features = useMemo(() => {
    if (geometry) {
      const feat = topojson.feature(geometry, geometry.objects[geoFeature]).features
      return feat.filter(f => !((isNumber(f.id) && isNaN(f.id)) || f.properties.name === 'Antarctica'))
    }
    else {
      return []
    }
  }, [geometry, geoFeature])

  const nationPath = useMemo(() => {
    return (geometry && indicateFeatures.length >= 1)
    ? path(topojson.feature(geometry, geometry.objects[indicateFeatures[0]]))
      : undefined
  }, [geometry, indicateFeatures, path])
  const statePath = useMemo(() => {
    return (geometry && indicateFeatures.length >= 2)
      ? path(topojson.mesh(geometry, geometry.objects[indicateFeatures[1]], (a, b) => a !== b))
      : undefined
  }, [geometry, indicateFeatures, path])
  const countyCheck = (a, b) => a !== b && (a.id / 1000 | 0) === (b.id / 1000 | 0)
  const countyPath = useMemo(() => {
    return (geometry && indicateFeatures.length >= 3)
      ? path(topojson.mesh(geometry, geometry.objects[indicateFeatures[2]], countyCheck))
      : undefined
  }, [geometry, indicateFeatures, path])




  const dayData = DATA ? (DATA.data[day] ? DATA.data[day] : {}) : {}

  const colorStops = useMemo(() => {
    return d3.range(0, 100., 10).map(x =>
      <stop
        key={x + ref}
        offset={x+"%"}
        stopColor={maxY ? linColorScale(x/100.*maxY) : "#eee"}
        stopOpacity="1">
      </stop>
    )
  }, [linColorScale, maxY])

  const ticks = useMemo(() => {
    var tickgs = []
    var ticksLabels = []
    var scale
    if (plotLog) {
      const possibleTicksLabels = [
        [1/100e6, "1/100M"],
        [1/10e6, "1/10M"],
        [1/1e6, "1/1M"],
        [1/100e3, "1/100k"],
        [1/10e3, "1/10k"],
        [1/1e3, "1/1k"],
        [1/100, "1/100"],
        [1/10, "1/10"],
        [1, "1"],
        [10, "10"],
        [100, "100"],
        [1e3, "1k"],
        [10e3, "10k"],
        [100e3, "100k"],
        [1e6, "1M"],
        [10e6, "10M"],
        [100e6, "100M"],
        [1e9, "1B"],
        [10e9, "10B"],
        [100e9, "100B"],
      ]
      ticksLabels = possibleTicksLabels.filter(x => (minPosY/1.2 < x[0]) && (x[0] < maxY*1.2))
      scale = d3.scaleLog([minPosY, maxY], [0, 300])
    }
    else {
      scale = d3.scaleLinear([0, maxY], [0, 300])
      ticksLabels = scale.ticks(5).map(t => [t, t])
    }
    for (const [tick, label] of ticksLabels) {
      const loc = scale(tick)
      tickgs.push(
       <g key={`${label}-${loc}`} transform={`translate(${loc}, 0)`}>
          <line
            y2="15"
            stroke="#222"
          />
          <text
            key={loc}
            style={{
              fontSize: "11px",
              textAnchor: "middle",
              transform: "translateY(25px)"
            }}>
            { label }
          </text>
        </g>
      )
    }
    return tickgs
  }, [plotLog, minPosY, maxY])

  if (!geometry) {
    return (
      <svg viewBox={svgGeometry}></svg>
    )
  }

  const mapPatches = features.map((f) => {
    // TODO: this is terrible. won't be robust if/when zooming implemented

    const cur = dayData[f.id]
    var value = cur ? extractValue(cur) : "-"
    value = value ? value : '-'
    const iMETA = META ? META[f.id] : {}

    return (
      <MapPatch
        key={f.id}
        g={f}
        getPath={path}
        geoFeature={geoFeature}
        iMETA={iMETA}
        metaToName={metaToName}
        value={value}
        colorScale={colorScale}
        width={width}
        height={height}
        maxY={maxY}
        ready={cur && DATA && META}
      />
    )

  })

  const title = statLabels[stat] + ' ' + normLabels[plotNorm]

  return (
    <>
      <h3>{title}</h3>
      <svg viewBox={svgGeometry} ref={ref} >
        <g transform={`translate(0,${colorbarHeight})`}
          fill="none" strokeLinejoin="round" strokeLinecap="round">
          {mapPatches}
          <path stroke="#fff" strokeWidth="0.25" d={countyPath}></path>
          <path stroke="#fff" strokeWidth="1" d={statePath}></path>
          <path stroke="#000" d={nationPath}></path>
        </g>

        <defs>
          <linearGradient
            id="CovidMap-gradient" spreadMethod="pad"
            x1="0%" y1="100%" x2="100%" y2="100%">
            {colorStops}
          </linearGradient>
        </defs>

        <g transform="translate(550,0)" >
          <rect width="300" height="15" style={{fill: "url(#CovidMap-gradient"}} >
          </rect>
          {ticks}
        </g>

        <g transform="translate(420,15)" >
          {/* <g transform="translate(420,15)" transformOrigin="right"> */}
          <text style={{fontWeight: "bold"}}>{DATA ? DATA.daysDates[day] : null}</text>
        </g>
      </svg>
      <Citations dataSpec={dataSpec} />
    </>
  )
}


const CovidMapBlock = (props) => {

  const dataSpec = props.dataSpec

  const { DATA, geoFeatures } = useLoad(dataSpec)
  const geoFeature = geoFeatures[0]
  const statNames = DATA ? DATA.statNames : []
  const enabledStatNames = [
    'positives', 'new_positives_stl',
    'deaths', 'new_deaths_stl',
    // 'hospital', 'new_hospital_stl',
    'vaccinations', 'new_vaccinations',
    'full_vaccinations', 'new_full_vaccinations',
    'hospital_currently',
  ]

  const daysDefaults = {
    daysDates: {},
    minDay: 0,
    maxDay: 0,
  }
  const { daysDates, minDay, maxDay } = DATA ? DATA : daysDefaults

  const [isPlaying, setIsPlaying] = useState(false)
  const [plotDay, setPlotDay] = useState(
    (Object.keys(daysDates).find(day => daysDates[day] === props.plotDate))
    || maxDay
  )
  const [plotStat, setPlotStat] = useState(props.plotStat || 'positives')
  const [plotNorm, setPlotNorm] = useState(props.plotNorm || 'one')
  const [plotLog, setPlotLog] = useState(props.plotLog || false)

  const playSkips = geoFeature === 'counties' ? [4, 1] : [1, 1]
  const playDelays = geoFeature === 'counties' ? [250, 250] : [1, 100]
  const playIsOld = plotDay + 31 < maxDay
  const playIsLatest = plotDay === 0

  useInterval(() => {
    const dday = playIsOld ? playSkips[0] : playSkips[1]
    const newDay = plotDay + dday
    if (newDay > maxDay) {
      setPlotDay(minDay)
    }
    else {
      setPlotDay(newDay)
    }
  }, isPlaying ? (playIsLatest ? playDelays[1]*10 : playIsOld ? playDelays[0] : playDelays[1]) : null)

  const dateFormatter = (day) => daysDates[day]

  if (DATA && !statNames.includes(plotStat) && !props.plotStat) {
    setPlotStat('positives')
  }

  const normFieldName = `mapnorm`

  return (
    <div className='CovidBlock'>
      <Loading done={DATA}>
        <CovidMap
          dataSpec={dataSpec}
          stat={plotStat}
          day={plotDay}
          plotNorm={plotNorm}
          plotLog={plotLog}
        />
      </Loading>
      {
        DATA && (!props.plotDate)
          ?
            <div className={styles.controls}>
              <span className={styles.slider}>
                <label className={styles.control}>
                  <input
                    className={styles.control}
                    type='checkbox'
                    checked={isPlaying}
                    onChange={e => setIsPlaying(e.target.checked)}
                  />
                  Play
                </label>
                <SliderWithTooltip
                  className={styles.actualSlider}
                  onChange={setPlotDay}
                  value={plotDay}
                  min={minDay}
                  max={maxDay}
                  tipFormatter={dateFormatter}
                />
              </span>
              <span className={styles.slider}
                style={{
                  textAlign:'right',
                  width:'100%',
                  margin: 0,
                  paddingTop: '-1em',
                  paddingRight: '4em',
                  fontSize:'80%'
                }}
              >
                play speed slows during latest 30 days
              </span>
            </div>
            : null
      }
      {
        DATA && (!props.plotStat)
          ?
            <div className={styles.controls}>
              <div
                className={styles.control}
                onChange={e => setPlotStat(e.target.value)}
              >
                {/* TODO: generate dynamically? */}
                {
                  enabledStatNames.filter(sn => statNames.includes(sn)).map(sn => (
                    <label className={styles.stat} key={`plotstat_${sn}`}>
                      <input
                        type='radio'
                        value={sn}
                        name='stat'
                        // checked={sn === plotStat}
                        defaultChecked={sn === plotStat} />
                      {statLabels[sn]}
                    </label>
                  ))
                }
              </div>
            </div>
            : null
      }
      {
        DATA && (!props.plotNorm)
          ?
            <div className={styles.controls}>
              <div
                className={styles.control}
                onChange={e => setPlotNorm(e.target.value)}
              >
                <fieldset id={normFieldName} style={{border: `0px`}}>
                  <label className={styles.norm}>
                    <input type='radio' value='one' name={normFieldName} {...{defaultChecked: true}} />
                    No scaling
                  </label>
                  <label className={styles.norm}>
                    <input type='radio' value='population' name={normFieldName} />
                    Per person
                  </label>
                  <label className={styles.norm}>
                    <input type='radio' value='land_area' name={normFieldName} />
                    Per square mile
                  </label>
                </fieldset>
              </div>
              <label className={styles.control}>
                <input
                  type='checkbox'
                  checked={plotLog}
                  onChange={e => setPlotLog(e.target.checked)}
                />
                Log colorscale
              </label>
            </div>
            : 
          null
      }
    </div>
  )

}

export { CovidMapBlock as default, CovidMap }
