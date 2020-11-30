const db = require('../../utils/db.js')


/**
 * @param {UUID} id users_jobs unique id
 * @param {String} status
 */
const updateStatus = async (id, status) => {
  return db.update('users_job/update_status', [id, status])
}


module.exports = {
  updateStatus
}