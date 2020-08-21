const db = require('../../../utils/db.js')


const getAll = async (ids) => {
  return await db.select('microsoft/credential/get', [ids])
}


module.exports = {
  getAll
}