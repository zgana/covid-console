import React from "react"

const Item = ({children}) => (
  <li style={{display: "block", margin: "auto"}}>
    {children}
  </li>
)

export default function Footer() {
  return (
    <footer>
      <div
        style={{
          marginTop: `4rem`,
          marginBottom: `1rem`,
          textAlign: `center`,
          fontSize: `.8rem`,
        }}>
        <ul>
          <Item>
            Built by <a
              href="mailto:mike.d.richman@gmail.com"
              target="_blank" rel="noopener noreferrer">
              Mike Richman
            </a>
          </Item>
          <Item>
            Source code <a
              href="https://github.com/zgana/covid-console"
            target="_blank" rel="noopener noreferrer">on GitHub</a>
          </Item>
        </ul>
      </div>
    </footer>
  )
}
