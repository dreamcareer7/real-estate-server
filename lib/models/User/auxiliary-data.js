const db = require('../../utils/db')
const promisify = require('util').promisify

const UserAuxiliaryData = {
  async save(userId, key, value) {
    return promisify(db.query)('user/auxiliary_data/insert', [userId, {[key]: value}])
  },

  async findByKey(key) {
    const data = await db.select('user/auxiliary_data/find_by_key', [key])
    if (data.length) {
      return data[0].data
    }
    throw Error.ResourceNotFound('Key not found')
  }
}

module.exports = UserAuxiliaryData