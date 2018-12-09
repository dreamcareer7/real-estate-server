const db = require('../../utils/db')
const Orm = require('../Orm')

const UserRole = {}

global['UserRole'] = UserRole

Orm.register('user_role', 'UserRole', UserRole)

UserRole.getForUser = async user_id => {
  const res = await db.query.promise('user/role/for-user', [user_id])
  return res.rows
}

UserRole.associations = {
  brand: {
    model: 'Brand'
  }
}

module.exports = UserRole
