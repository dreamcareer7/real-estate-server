const db = require('../../utils/db')
const Context = require('../Context')
const Orm = require('../Orm')

class BrandEvent {
  /**
   * @param {UUID[]} ids 
   * @returns {Promise<IBrandEvent[]>}
   */
  async getAll(ids) {
    return db.select('brand/event/get', [ids])
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
      JSON.stringify(events),
      Context.getId()
    ])
  }

  /**
   * @param {UUID} user_id 
   * @param {UUID} event_id 
   * @param {IBrandEventInput} event 
   */
  async update(user_id, event_id, event) {
    return db.update('brand/event/update', [
      user_id,
      Context.getId(),
      event_id,
      event.task_type,
      event.title,
      event.description
    ])
  }

  /**
   * @param {UUID} user_id 
   * @param {UUID[]} events
   */
  async delete(user_id, events) {
    return db.update('brand/event/delete', [
      user_id,
      Context.getId(),
      events,
    ])
  }
}

const Model = new BrandEvent()

Orm.register('brand_event', 'BrandEvent', Model)

module.exports = Model
