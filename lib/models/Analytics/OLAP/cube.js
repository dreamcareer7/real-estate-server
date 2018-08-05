const _ = require('lodash')

class CubeBase {
  constructor(model) {
    /** @type {string} */
    this.fact_table = model.fact_table
    /** @type {string} */
    this.name = model.name
    this.dimensions = _.keyBy(model.dimensions, 'name')
    this.aggregates = model.aggregates
  }
}

module.exports = CubeBase
