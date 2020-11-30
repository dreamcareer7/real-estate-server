const db = require('../../utils/db.js')


/**
 * @param {UUID} id users_jobs unique id
 * @param {String} status
 */
const updateStatus = async (id, status) => {
  return db.update('users_job/update_status', [id, status])
}

/**
 * @param {UUID} id users_jobs unique id
 * @param {String} interval
 */
const postpone = async (id, interval) => {
  return db.update('users_job/postpone', [id, interval])
}


module.exports = {
  updateStatus,
  postpone
}