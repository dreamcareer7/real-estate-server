const db = require('../../utils/db.js')

const remove = async function(notification_id) {
  return db.query.promise('notification/delete', [notification_id])
}

module.exports = {
  remove,
}
