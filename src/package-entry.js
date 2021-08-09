'use strict'

if (process.env.NODE_ENV === 'production') {
  module.exports = require('./kaiku.min.js')
} else {
  module.exports = require('./kaiku.dev.js')
}
