const CubeBase = require('../cube')

const dealModel = require('./deal')

module.exports = {
  Deals: new CubeBase(dealModel)
}
