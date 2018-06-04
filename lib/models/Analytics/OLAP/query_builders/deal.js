const QueryBuilder = require('../query')
const { Deals } = require('../cubes')

class DealsQueryBuilder extends QueryBuilder {
  /**
   * @param {any[]=} drilldowns 
   * @param {any[]=} filters 
   * @param {UUID=} user_id
   */
  constructor(drilldowns, filters, user_id) {
    super(Deals, drilldowns, filters, user_id)
  }

  _addWhere() {
    if (!this.q) throw 'q is not initialized yet!'

    if (this.user_id)
      this.q.where('EXISTS (SELECT ub.brand FROM user_brands(?) ub WHERE ub.brand = brand)', this.user_id)

    return super._addWhere()
  }
}

module.exports = DealsQueryBuilder
