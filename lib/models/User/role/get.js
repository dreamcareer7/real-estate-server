const db = require('../../../utils/db')


const getForUser = async user_id => {
  const res = await db.query.promise('user/role/for-user', [user_id])

  return res.rows
}


module.exports = {
  getForUser
}