const db = require('../../../utils/db')

/** @param {IContactRole['id'][]} ids */
async function _delete (ids) {
  if (!ids?.length) { return 0 }

  return db.update('contact/role/delete', [ids])
}

module.exports = {
  delete: _delete
}
