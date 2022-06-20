const db = require('../../../utils/db')

const getTotalUsedQuota = async (user_id) => {
  const res = await db.selectOne('email/campaign/used_quota', [user_id])

  return parseInt(res.count)
}

module.exports = {
  getTotalUsedQuota,
}
