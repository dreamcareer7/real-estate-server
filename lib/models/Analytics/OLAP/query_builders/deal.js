const QueryBuilder = require('../query')

class DealsBaseQueryBuilder extends QueryBuilder {
  _addWhere() {
    if (!this.q) throw 'q is not initialized yet!'

    if (this.user_id)
      this.q.where('brand IN (SELECT brand_children(?))', this.brand_id)
    else
      throw Error('[DealsBaseQueryBuilder] user_id is not specified.')

    return super._addWhere()
  }
}

module.exports = function(cube) {
  return class extends DealsBaseQueryBuilder {
    constructor(drilldowns, filters, user_id, brand_id) {
      super(cube, drilldowns, filters, user_id, brand_id)
    }
  }
}