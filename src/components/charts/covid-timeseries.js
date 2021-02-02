// components/libs
import React from 'react'
import Slider, { createSliderWithTooltip } from 'rc-slider'
import 'rc-slider/assets/index.css'
import Select from 'react-select'
import 'react-dropdown/style.css'
// import { Tooltip } from "react-svg-tooltip"
import chroma from 'chroma-js'
import * as d3 from 'd3'

// visx
import { scaleLinear, scaleLog, scaleTime } from '@visx/scale'
import { AxisBottom, AxisLeft } from '@visx/axis'
import { GridRows, GridColumns } from '@visx/grid';
import { Group } from '@visx/group';
import { LinePath } from '@visx/shape'
import { curveLinear } from '@visx/curve'
import { Text } from '@visx/text'

// hooks
import { useState, useMemo, useCallback } from 'react'
// import useInterval from '@use-it/interval'

// site
import Loading from '../loading'
import styles from './covid-charts.module.css'
import useLoad, { allDataSpecs, statLabels, normLabels } from '../data'
import DataSpecSelector from './data-spec-selector.js'


const SliderWithTooltip = createSliderWithTooltip(Slider)

const colorCycle = [
  '#1f77b4',
  '#ff7f0e',
  '#2ca02c',
  '#d62728',
  '#9467bd',
  '#8c564b',
  '#e377c2',
  '#7f7f7f',
  '#bcbd22',
  '#17becf'
]

const addDays = (date, days) => {
  var result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}


const StatSelector = (props) => {
  const {
    stat,
    selected, setSelected,
    offset, setOffset,
    scale, setScale,
    setLinestyle
  } = props

  const scaleScale = x => 10**x
  const scaleUnScale = x => Math.log10(x)

  const lsInputStyle = {
    height: 0,
    width: 0,
    opacity: 0,
    margin: 0,
    padding: 0,
    display: 'none',
  }

  const [w1, w2] = [4, 2]

  return (
    <div style={{ display: `inline-block`, width: `100%` }}>
      <label style={{ display: `inline-block`, width: `40%` }} >
        <input
          type='checkbox'
          checked={selected}
          onChange={e => setSelected(e.target.checked)}
          style={{
            marginRight: `.5rem`
          }}
        />
        {statLabels[stat]}
      </label>
      <SliderWithTooltip
        disabled={!selected}
        onChange={setOffset}
        value={offset} startPoint={0}
        min={-50} max={+50}
        style={{
          display: `inline-block`,
          width: `20%`,
          marginLeft: `2%`,
        }}
        tipFormatter={
          x => `${x<0 ? '' : '+'}${x} days`
        }
      />
      <SliderWithTooltip
        disabled={!selected}
        onChange={x => setScale(scaleScale(x))}
        value={scaleUnScale(scale)} startPoint={0}
        min={-3.5} max={3.5} step={.005}
        style={{
          display: `inline-block`,
          width: `20%`,
          marginLeft: `2%`,
        }}
        tipFormatter={
          x => `${scaleScale(x) < 1 ? scaleScale(x).toFixed(3) : scaleScale(x).toFixed(2)}x`
        }
      />
      <div
        onChange={e => setLinestyle(e.target.value)}
        style={{
          display: `inline-block`
        }}
      >
          <input id={`${stat}-ls1`} type='radio' value={[w1,'solid']} name={`ls_${stat}`} defaultChecked
            style={lsInputStyle} disabled={!selected} />
          <label className={`${styles.ls} ${styles.bold}`} htmlFor={`${stat}-ls1`} >
            &#8212;
          </label>
          <input id={`${stat}-ls3`} type='radio' value={[w1,'dashed']} name={`ls_${stat}`}
            style={lsInputStyle} disabled={!selected} />
          <label className={`${styles.ls} ${styles.bold}`} htmlFor={`${stat}-ls3`}>
            --
          </label>
          <input id={`${stat}-ls2`} type='radio' value={[w2,'solid']} name={`ls_${stat}`}
            style={lsInputStyle} disabled={!selected} />
          <label className={styles.ls} htmlFor={`${stat}-ls2`}>
            &#8212;
          </label>
          <input id={`${stat}-ls4`} type='radio' value={[w2,'dashed']} name={`ls_${stat}`}
            style={lsInputStyle} disabled={!selected} />
          <label className={styles.ls} htmlFor={`${stat}-ls4`}>
            --
          </label>
      </div>
    </div>
  )
}


const CovidTimeseries = (props) => {

  const {
    dataSpec,
    plotStats, plotIds,
    plotNorm, plotLogY,
    statScales, statOffsets,
    statLinestyles
  } = props

  const {
    DATA,
    META,
  } = useLoad(dataSpec)

  // pixel geometry
  const width = 900
  const height = 400
  const margin = { top: 40, right: 30, bottom: 50, left: 150 }
  const panelWidth = width - margin.left - margin.right
  const panelHeight = height - margin.top - margin.bottom
  const svgGeometry = `0 0 ${width} ${height}`

  const tdata = useMemo(() => {
    var D = {}
    for (const id of plotIds) {
      D[id] = []
      for (const day of DATA.uniqueDays) {
        if (id in DATA.data[day]) {
          D[id].push(DATA.data[day][id])
        }
      }
      D[id] = D[id].sort((da,db) => (+da.days) - (+db.days))
    }
    return D
  }, [DATA, plotIds])

  const extractValue = useCallback(
    (d, stat) => {
      const scale = statScales[stat]
      const value = scale * d[stat]
      var norm = 1
      if (plotNorm === "population") {
        norm = META[d.id].population
      }
      else if (plotNorm === "land_area") {
        norm = Math.max(META[d.id].land_area, 1)
      }
      return value / norm
    },
    [plotNorm, META, statScales]
  )


  // TODO: don't try to parse date strings
  const minOffset = d3.min(Object.keys(statOffsets).map(stat => statOffsets[stat]))
  const maxOffset = d3.max(Object.keys(statOffsets).map(stat => statOffsets[stat]))
  const minX = DATA ? addDays(new Date(DATA.daysDates[DATA.minDay]), minOffset) : undefined
  const maxX = DATA ? addDays(new Date(DATA.daysDates[DATA.maxDay]), maxOffset) : undefined
  const maxY = tdata
    ? d3.max(
      plotIds.map(id => d3.max(
        plotStats.map(stat => d3.max(
          tdata[id].map(d => extractValue(d, stat))
        ))
      ))
    )
    : 1
  const minPosY = DATA
    ? d3.min(
      plotIds.map(id => d3.min(
        plotStats.map(stat => d3.min(
          tdata[id].map(d => (extractValue(d, stat) > 0 ? extractValue(d, stat) : maxY) )
        ))
      ))
    )
    : 1
  const minY = plotLogY ? minPosY : 0

  const xAxisScale = DATA
    ? scaleTime({ domain: [minX, maxX], range: [0, panelWidth] })
    : undefined
  const xScale = DATA
    ? scaleTime({ domain: [DATA.minDay-minOffset, DATA.maxDay+maxOffset], range: [0, panelWidth] })
    : undefined
  const yScale = (plotLogY ? scaleLog : scaleLinear)(
    { domain: [minY, maxY], range: [panelHeight, 0], round: true, }
  )

  const xtickLabelProps = () => ({ fill: '#333', fontSize: 20, textAnchor: 'end', dy: 5})
  const ytickLabelProps = () => ({ fill: '#333', fontSize: 20, textAnchor: 'end', dx: -15, dy: 5})

  if (!(DATA && META)) {
    return ( <svg viewBox={svgGeometry}></svg> )
  }

  const yAxisLabel = 'Value ' + normLabels[plotNorm]

  return (
    <>
      <h3>timeseries</h3>
      <svg viewBox={svgGeometry}>
        <Group left={margin.left} top={margin.top}>
          <GridRows scale={yScale} width={panelWidth} height={panelHeight} stroke="#eee" />
          <GridColumns scale={xAxisScale} width={panelWidth} height={panelHeight} stroke="#eee" />
          <AxisLeft
            scale={yScale}
            numTicks={5}
            tickLabelProps={ytickLabelProps}
          />
          <AxisBottom
            scale={xAxisScale}
            tickLabelProps={xtickLabelProps}
            numTicks={5}
            top={panelHeight} />
        </Group>
        <Group top={margin.top + panelHeight/2}>
          <Text angle={-90} textAnchor='middle' verticalAnchor='start'>{yAxisLabel}</Text>
        </Group>
        <Group left={margin.left} top={margin.top}>
          {
            tdata && plotIds && plotStats
              ? 
              plotStats.map(stat => plotIds.map(id => {
                const i = plotIds.indexOf(id)
                const color = i >= 0 ? chroma(colorCycle[i%colorCycle.length]) : null
                const [w, dash] = statLinestyles[stat].split(',')
                return (
                  <LinePath
                    key={`curve_${id}`}
                    curve={curveLinear}
                    data={tdata[id]}
                    x={d => xScale(d.days + statOffsets[stat])}
                    y={d => yScale(Math.max(minY, extractValue(d, stat)))}
                    stroke={color.alpha(.5).css()}
                    strokeWidth={w}
                    strokeDasharray={dash === 'solid' ? '1,0' : '4,2'}
                  />
                )
              })
              )
              : null
          }
        </Group>
      </svg>
    </>
  )

};


const CovidTimeseriesBlock = (props) => {

  const enabledStatNames = [
    'new_positives_stl',
    'new_deaths_stl',
    'new_vaccinations_stl',
    'new_full_vaccinations_stl',
    'hospital_currently',
    'positives',
    'deaths',
    'vaccinations',
    'full_vaccinations',
  ]

  // const defaultDataSpec = props.dataSpec || allDataSpecs[0]
  // const [dataSpec, setDataSpec] = useState(defaultDataSpec)
  const dataSpec = props.dataSpec

  const { DATA, META, metaToName } = useLoad(dataSpec)
  const statNames = DATA ? DATA.statNames : []

  const [statOffsets, setStatOffsets] = useState(
    Object.fromEntries(enabledStatNames.map(x => [x, 0]))
  )
  const [statScales, setStatScales] = useState(
    Object.fromEntries(enabledStatNames.map(x => [x, 1]))
  )

  const [statLinestyles, setStatLinestyles] = useState(
    Object.fromEntries(enabledStatNames.map(x => [x, '4,solid']))
  )

  const [plotItems, setPlotItems] = useState(() => {
    var allPlotItems = {}
    for (const ds of allDataSpecs) {
      allPlotItems[ds] = []
    }
    return allPlotItems
  })

  const [plotStats, setPlotStats] = useState(['new_positives_stl'])
  const [plotNorm, setPlotNorm] = useState('one')
  const [plotLogY, setPlotLogY] = useState(false)

  const locSelectStyles = {
    multiValue: (styles, { data }) => {
      const i = plotItems[dataSpec].indexOf(data)
      const color = i >= 0 ? chroma(colorCycle[i%colorCycle.length]) : null
      var out = {...styles}
      if (i >= 0) {
        out = {
          ...out,
          backgroundColor: color.alpha(.5).css(),
        }
      }
      return out
    }
  }

  return (
    <div className='CovidBlock'>
      <Loading done={DATA}>
        {/* <h3>.</h3> */}
        <CovidTimeseries
          dataSpec={dataSpec}
          plotStats={plotStats}
          plotIds={plotItems[dataSpec] ? plotItems[dataSpec].map(it => it.value) : []}
          plotNorm={plotNorm}
          plotLogY={plotLogY}
          statScales={statScales}
          statOffsets={statOffsets}
          statLinestyles={statLinestyles}
        />
      </Loading>
      <div className={styles.controls}>
        <div style={{ margin: `.5rem 0` }}>
          <Select
            isMulti
            options={
              META
                ? Object.keys(META)
                .map( k => ({ value: k, label: metaToName(META[k]) }) )
                .sort( (a,b) => a.label.localeCompare(b.label) )
                : []
            }
            value={plotItems[dataSpec]}
            clearValue={() => setPlotItems({...plotItems, [dataSpec]: []})}
            onChange={x => setPlotItems({...plotItems, [dataSpec]: x})}
            styles={locSelectStyles}
          />
        </div>
        {
          enabledStatNames.filter(sn => statNames.includes(sn)).map(sn => (
            <StatSelector
              key={`selectors_${sn}`}
              stat={sn}
              selected={plotStats.includes(sn)}
              offset={statOffsets[sn]}
              scale={statScales[sn]}
              setSelected={
                isSelected => {
                  var stats = plotStats.filter(x => x !==sn)
                  if (isSelected) {
                    stats.push(sn)
                  }
                  setPlotStats(stats)
                }
              }
              setOffset={
                x => setStatOffsets({...statOffsets, [sn]: x})
              }
              setScale={
                x => setStatScales({...statScales, [sn]: x})
              }
              setLinestyle={
                x => setStatLinestyles({...statLinestyles, [sn]: x})
              }
            />
          ))
        }
        <div
          className={styles.control}
          onChange={e => setPlotNorm(e.target.value)}
        >
          <label className={styles.norm}>
            {/* <input type='radio' value='one' name='norm' defaultChecked /> */}
            <input type='radio' value='one' name='norm' {...{defaultChecked: true}} />
            No scaling
          </label>
          <label className={styles.norm}>
            <input type='radio' value='population' name='norm' />
            Per person
          </label>
          <label className={styles.norm}>
            <input type='radio' value='land_area' name='norm' />
            Per square mile
          </label>
        </div>
        <label className={styles.control}>
          <input
            type='checkbox'
            checked={plotLogY}
            onChange={e => setPlotLogY(e.target.checked)}
          />
          Log y-scale
        </label>
      </div>
    </div>
  )
}

export default CovidTimeseriesBlock
