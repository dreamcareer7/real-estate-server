const db  = require('../../../../utils/db')

const getAll = async ids => {
  return await db.select('email/campaign/recipient/get', [ids])
}

module.exports = { getAll }
