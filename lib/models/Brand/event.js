const db = require('../../utils/db')
const Orm = require('../Orm')

class BrandEvent {
  async getAll(ids) {
    return db.query.promise('brand/event/get', [ids])
  }

  /**
   * @param {UUID} user_id
   * @param {UUID} brand_id
   * @param {IBrandEventInput[]} events 
   */
  async createAll(user_id, brand_id, events) {
    return db.selectIds('brand/event/create', [
      user_id,
      brand_id,
      JSON.stringify(events)
    ])
  }
}

const Model = new BrandEvent()

Orm.register('brand_event', 'BrandEvent', Model)

module.exports = Model
