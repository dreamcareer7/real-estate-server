const db = require('../../../utils/db')

/**
 * @param {UUID[]} ids
 * @returns {Promise<INotification[]>}
 */
async function getAll(ids) {
  return db.map('showing/notification/get', [ids], (n) => ({ ...n, type: 'showing_appointment_notification' }))
}

module.exports = {
  getAll,
}
