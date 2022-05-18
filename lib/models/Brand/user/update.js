const db = require('../../../utils/db')

async function updateLastInvited(brand_user) {
  return db.update('brand/role/member/update-last-invited', [brand_user])
}

module.exports = {
  updateLastInvited
}
