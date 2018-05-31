const _ = require('lodash')

class CubeBase {
  constructor(model) {
    /** @type {string} */
    this.fact_table = model.fact_table
    this.dimensions = _.keyBy(model.dimensions, 'name')
    this.aggregates = model.aggregates
  }
}

module.exports = CubeBase
