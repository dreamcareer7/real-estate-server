const db = require('../../../utils/db')

const saveThreadKey = async (id, key) => {
  return db.update('email/campaign/save_thread_key', [id, key])
}

module.exports = {
  saveThreadKey
}
