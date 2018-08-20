const CubeBase = require('../cube')

const deals = require('./deal')

module.exports = {
  Deals: new CubeBase(deals)
}
