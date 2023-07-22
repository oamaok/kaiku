if (process.env.KAIKU_JSX) {
  module.exports = {
    presets: ["@babel/preset-env"],
    plugins: [
      [
        "@babel/plugin-transform-react-jsx",
        { runtime: "automatic", importSource: "kaiku" }
      ]
    ]
  }
} else {
  module.exports = {
    presets: ["@babel/preset-env"],
    plugins: [
      [
        "@babel/plugin-transform-react-jsx",
        { pragma: "h", pragmaFrag: "Fragment" }
      ]
    ]
  }
}
