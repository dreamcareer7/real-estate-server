const db = require('../../../utils/db.js')

const deleteAccount = (id) => {
  return db.selectIds('facebook/facebook_pages/delete', [id])
}

module.exports = deleteAccount