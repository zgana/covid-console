import React, { useState, useEffect, useCallback, useRef } from 'react'
import Parser from 'yargs-parser/browser'
import { GlobalHotKeys } from 'react-hotkeys'

import CovidMapBlock from './charts/covid-map'
import useLoad, { allDataSpecs } from './data'


const globalKeyMap = {
  MOVE_UP: ['up', 'k'],
  MOVE_DOWN: ['down', 'j'],
  DELETE: 'x',
  ADD_ABOVE: 'a',
  ADD_BELOW: 'b',
  END_INSERT: 'esc',
  BEGIN_INSERT_OR_RUN_AND_NEXT: 'enter',
  RUN_IN_PLACE: 'ctrl+enter',
}


const ParsedArgs = (props) => {

  const { pos, cmd, args, opts } = props

  return (
    <div>
      <div>
        <span style={{ fontWeight: 'bold' }}>{cmd}</span>
      </div>
      <div>
        Positional:
        <ul>
          {args.map((a,i) => (
            <li key={`${pos}_arg_${i}`}>{a}</li>
          ))}
        </ul>
        Optional:
        <ul>
          {
            Object.keys(opts).map(k => (
              <li key={`${pos}_opt_${k}`}>{k}: {opts[k]}</li>
            ))
          }
        </ul>
      </div>
    </div>
  )
}

const OutputCell = ({ children }) => {

  return (
    <pre
      style={{
        display:`block`,
        width: `100%`,
        border: `.5px solid #ddd`,
        borderRadius: `.5rem`,
        background: `#fafafa`,
        padding: `.5rem`,
        whiteSpace: `pre-wrap`
      }}>{children}</pre>
  )
}

const LsStatsOutputCell = (props) => {
  const { dataSpec } = props
  const { DATA } = useLoad(dataSpec)
  const output =
    'available stats:\n    ' 
    + (DATA ? DATA.statNames.join('\n    ') : '(loading...)')
  // const output = '...'
  return (
    <OutputCell>{output}</OutputCell>
  )
}

const NotebookOutput = (props) => {

  const { command, pos } = props

  var opts = Parser(command)
  const [cmd, args] = [opts._[0], opts._.slice(1)]
  delete opts._

  // console.log(cmd, opts, args)

  if (!cmd) {
    return (
      <></>
    )
  }
  else if (cmd === 'help') {
    return (
      <OutputCell>{`available commands:
    keys:               list keyboard shortcuts
    ls:                 list datasets 
    stats:              list available statistics for a dataset
    map:                display maps
    ts:                 (coming soon!) display timeseries charts
    help:               this command

    map help:           more about the 'map' command
    ts help:            more about the 'ts' command
        `}</OutputCell>
    )
  }
  else if (cmd === 'keys') {
    const output =
      `global keyboard shortcuts:\n    `
      + Object.keys(globalKeyMap).map(k => 
        `${JSON.stringify(globalKeyMap[k]).padEnd(20,' ')}${k}`)
        .join(`\n    `)
    return (
      <OutputCell>{output}</OutputCell>
    )
  }
  else if (cmd === 'ls') {
    const output =
      'available datasets:\n    '
      + allDataSpecs.join('\n    ')
      + '\n\n'
    return (
      <OutputCell>{output}</OutputCell>
    )
  }
  else if (cmd === 'stats') {
    if (allDataSpecs.includes(args[0])) {
      return (
        <LsStatsOutputCell dataSpec={args[0]} />
      )
    }
    else {
      return (
        <OutputCell>{`usage:
    stats [dataset]

To find available datasets, see the 'ls' command.`}</OutputCell>
        
      )
    }
  }
  else if (cmd === 'map') {
    const help = (
      <OutputCell>{`usage:
    map [dataset] [statistic]
      {--norm={population|land_area}}
      {--log}
      {--date=[date]}

notes:
    --norm:     divides the statistic by this quantity
    --log:      use log colorscale (default is linear colorscale)
    --date:     display data from [date]

To find available datasets and statistics, see the 'ls' and 'stats' commands.`}</OutputCell>
    )
    if (args[0] === 'help' || args.length !== 2) {
      return help
    }

    const dataSpec = args[0]
    const plotStat = args[1]
    const plotDate = opts.date
    const plotNorm = opts.norm || 'one'
    const plotLog = 'log' in opts || false

    return (
      <CovidMapBlock
        dataSpec={dataSpec}
        plotStat={plotStat}
        plotNorm={plotNorm}
        plotLog={plotLog}
        plotDate={plotDate}
      />
    )
  }

  return (
    <>
      {/* <ParsedArgs cmd={cmd} args={args} opts={opts} pos={pos} /> */}
      <OutputCell>{`unknown command '${cmd}'; try 'help'`}</OutputCell>
    </>
  )

}

const InputCell = (props) => {

  const { index, isFocused, isInsert, takeFocus, command } = props

  const inputRef = useRef()

  const style = {
    width: `100%`,
    margin: `.2rem 0 .5rem`,
    padding: `.2rem .5rem`,
    border:  isFocused ? `2px solid #bdf` : `1px solid #ccc`,
    borderRadius: `.5rem`,
  }

  const cellId = `In_${index}`

  useEffect(() => {
    if (isFocused && inputRef) {
      inputRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'center',
      })
      if (isInsert) {
        inputRef.current.focus()
      }
    }
  })

  return (
    isFocused && isInsert
    ? (
      <input
        ref={inputRef}
        id={cellId}
        style={style}
        defaultValue={command}
      />
    )
    : (
      <pre
        ref={inputRef}
        id={cellId}
        onClick={takeFocus}
        style={{
          background: `#fafafa`,
          ...style
        }}>{command || ' '}</pre>
    )
  )

}


export default function Notebook(props) {

  const [commands, setCommands] = useState([
    // 'help',
    ''
    // 'map',
    // 'ls',
    // 'stats USA/state',
  ])
  const [focusIndex, setFocusIndex] = useState(commands.length-1)
  const [isInsert, setIsInsert] = useState(true)

  const notebookRef = useRef()

  var handlers = {
    MOVE_UP: e => {
      if (!isInsert) {
        setFocusIndex(Math.max(focusIndex - 1, 0))
      }
    },
    MOVE_DOWN: e => {
      if (!isInsert) {
        setFocusIndex(Math.min(focusIndex + 1, commands.length - 1))
      }
    },
    ADD_ABOVE: e => {
      if (!isInsert) {
        commands.splice(focusIndex, 0, '')
        setCommands([...commands])
      }
    },
    ADD_BELOW: e => {
      if (!isInsert) {
        commands.splice(focusIndex+1, 0, '')
        setCommands([...commands])
        setFocusIndex(focusIndex + 1)
      }
    },
    DELETE: e => {
      if (!isInsert) {
        const N = commands.length
        setCommands([...commands.slice(0, focusIndex), ...commands.slice(focusIndex+1)])
        if (focusIndex === N - 1) {
          setFocusIndex(focusIndex - 1)
        }
      }
    },
    END_INSERT: e => {
      setIsInsert(false)
      notebookRef.current.focus()
    },
    BEGIN_INSERT_OR_RUN_AND_NEXT: e => {
      if (!isInsert) {
        setIsInsert(true)
      }
      else {
        const N = commands.length
        var newCommands = commands
        newCommands.splice(focusIndex, 1, e.target.value)
        if (focusIndex === N - 1) {
          newCommands.push('')
        }
        setCommands([...newCommands])
        setFocusIndex(focusIndex+1)
      }
    },
    RUN_IN_PLACE: e => {
      if (isInsert) {
        const N = commands.length
        var newCommands = commands
        const toDelete = (focusIndex < N - 1) ? 1 : 0
        newCommands.splice(focusIndex, toDelete, e.target.value)
        setCommands([...newCommands])
      }
    },
  }

  // console.log('State:', focusIndex, commands)

  return (
    <>
      <GlobalHotKeys keyMap={globalKeyMap} handlers={handlers} allowChanges />
        <div ref={notebookRef} tabIndex={-1} style={{ marginBottom: `1rem`, outline: `0` }}>
          {
            commands.map((command, index) => (
              <div key={index}>
                <div style={{width: `100%`, position: `relative`, margin: `.5rem 0 .2rem`}}>
                  <InputCell
                    index={index}
                    isFocused={index === focusIndex}
                    isInsert={isInsert}
                    takeFocus={e => {
                      setFocusIndex(index)
                      setIsInsert(true)
                    }}
                    command={commands[index]}
                  />
                  {
                  }
                </div>
                <NotebookOutput key={`O[${index}] ${command}`} pos={index} command={command} />
              </div>
            ))
          }
        </div>
    </>
  )
}

