import React from 'react'

import styles from "./loading.module.css"


export default function Loading(props) {
  return (
    <>
      {
        props.done
          ?
          props.children
          :
          (
            <div style={{position: `relative`}}>
              <div style={{opacity: `50%`}}>
                {props.children}
              </div>
              <div
                className={styles.spinner}
                style={{
                  position: `absolute`,
                  display: `flex`,
                  alignItems: `center`,
                  height: `64px`,
                  width: `300px`,
                  top: `50%`,
                  left: `50%`,
                  transformOrigin: `center`,
                  transform: `translate(-50%,-50%)`,
                }}
              >
                <img
                  alt="spinning covid cartoon while site loads"
                  src="/logo64.png"
                />
                <span>
                  L o a d i n g . . .  
                </span>
              </div>
            </div>
          )
      }
    </>
  )

}
