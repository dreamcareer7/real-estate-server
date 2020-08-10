const config = require('../../../config')

if (process.env.NODE_ENV === 'tests') {
  const mock = require('./mock')
  module.exports = mock
  return
}

const chargebee = require('chargebee')
chargebee.configure(config.chargebee)

module.exports = chargebee
