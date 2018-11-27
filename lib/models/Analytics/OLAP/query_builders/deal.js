const squel = require('squel').useFlavour('postgres')
const QueryBuilder = require('../query')

class DealsBaseQueryBuilder extends QueryBuilder {
  _createQ() {
    super._createQ()
    this.q.with('bc', squel.select().field('brand_children', 'brand').from(squel.rstr('brand_children(?)', this.brand_id)))

    return this
  }

  _addWhere() {
    if (!this.q) throw 'q is not initialized yet!'

    if (this.brand_id)
      this.q.where('brand IN (SELECT * FROM bc)', this.brand_id)
    else
      throw Error('[DealsBaseQueryBuilder] brand_id is not specified.')

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
