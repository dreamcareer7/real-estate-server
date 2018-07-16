const QueryBuilder = require('../query')

class DealsBaseQueryBuilder extends QueryBuilder {
  _addWhere() {
    if (!this.q) throw 'q is not initialized yet!'

    if (this.user_id)
      this.q.where('EXISTS (SELECT ub.brand FROM user_brands(?) ub WHERE ub.brand = brand)', this.user_id)

    return super._addWhere()
  }
}

module.exports = function(cube) {
  return class extends DealsBaseQueryBuilder {
    constructor(drilldowns, filters, user_id) {
      super(cube, drilldowns, filters, user_id)
    }
  }
}