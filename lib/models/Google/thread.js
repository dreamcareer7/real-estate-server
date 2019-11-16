const { EventEmitter } = require('events')
const db = require('../../utils/db')

class GoogleThread extends EventEmitter {
  /**
   * @param {string[]} ids 
   * @returns {Promise<IGoogleThread[]>}
   */
  async getAll(ids) {
    return db.select('google/thread/get', [ ids ])
  }
}

module.exports = new GoogleThread
