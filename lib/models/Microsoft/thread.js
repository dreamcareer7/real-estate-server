const { EventEmitter } = require('events')
const db = require('../../utils/db')

class MicrosoftThread extends EventEmitter {
  /**
   * @param {string[]} ids 
   */
  async getAll(ids) {
    return db.select('microsoft/thread/get', [ ids ])
  }
}

module.exports = new MicrosoftThread
