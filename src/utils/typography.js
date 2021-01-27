import Typography from "typography"
import fairyGatesTheme from "typography-theme-fairy-gates"

const typography = new Typography(fairyGatesTheme)

typography.overrideThemeStyles = () => ({
  'a': {
    color: "MidnightBlue",
    },
})


export const { scale, rhythm, options } = typography
export default typography
