const RechatPeanar = require('./app')
const MockPeanar = require('./mock')

const peanar = (process.env.NODE_ENV === 'tests')
  ? new MockPeanar()
  : new RechatPeanar()

module.exports = { peanar }
