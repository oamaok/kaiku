if (process.env.KAIKU_JSX_RUNTIME) {
  const nodeEnv =
    process.env.KAIKU_VERSION === 'development' ? 'development' : 'production'
  module.exports = {
    presets: ['@babel/preset-env'],
    plugins: [
      ['transform-define', { 'process.env.NODE_ENV': nodeEnv }],
      [
        '@babel/plugin-transform-react-jsx',
        { runtime: 'automatic', importSource: 'kaiku' },
      ],
    ],
  }
} else {
  module.exports = {
    presets: ['@babel/preset-env'],
    plugins: [
      [
        '@babel/plugin-transform-react-jsx',
        { pragma: 'h', pragmaFrag: 'Fragment' },
      ],
    ],
  }
}
