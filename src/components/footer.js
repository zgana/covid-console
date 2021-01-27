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
            Built by Mike Richman
          </Item>
          <Item>
            <a href="mailto:mike.d.richman@gmail.com">
              mike.d.richman@gmail.com
            </a>
          </Item>
        </ul>
      </div>
    </footer>
  )
}
