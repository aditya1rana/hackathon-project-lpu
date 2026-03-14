/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "#0FBD49",
        primaryDark: "#086C29",
        primaryLight: "#0FBD4922",
        background: "#061D13",
        card: "#0B2919",
        cardElevated: "#134026",
        textMain: "#E6EDF3",
        textSecondary: "#8B949E",
        border: "#1E472C",
        success: "#0FBD49",
        gold: "#EEBD2B",
        danger: "#F85149",
      },
    },
  },
  plugins: [],
}
