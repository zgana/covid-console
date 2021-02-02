import React from 'react'
import Select from 'react-select'
import styles from './covid-charts.module.css'

import { allDataSpecs } from '../data'

export default function DataSpecSelector(props) {

    const { dataSpec, setDataSpec } = props

    return (
        <div className={styles.dataSpecSelector} >
            <Select
                options={allDataSpecs.map( k => ({ value: k, label: k }) )}
                value={dataSpec}
                placeholder={dataSpec}
                onChange={x => setDataSpec(x.value)}
            />
        </div>
    )
}
