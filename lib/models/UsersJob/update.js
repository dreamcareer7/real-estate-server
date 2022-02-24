const db = require('../../utils/db.js')
const Context = require('../Context')

/**
 * @param {UUID} id users_jobs unique id
 * @param {String} status pending/failed/success
 */
const updateStatus = async (id, status) => {
  Context.log('SyncMicrosoftCalendar - enter updateStatus:', id, 'to', status)

  let now = null

  if ( status === 'success' ) {
    now = new Date()
  }

  Context.log('Updating UsersJob', id, 'to', status, 'now', now)

  return db.update('users_job/update_status', [id, status, now])
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