const db = require('../../../utils/db')

const emitter = require('./emitter')

const addMember = async ({role, user}) => {
  await db.insert('brand/role/member/add', [
    role,
    user
  ])

  emitter.emit('member:join', {
    role,
    user
  })
}

const removeMember = async (role, user) => {
  await db.update('brand/role/member/remove', [
    role,
    user
  ])

  emitter.emit('member:leave', {
    role,
    user
  })
}

const getMembers = async role => {
  return db.map('brand/role/member/by_role', [role], 'user')
}

module.exports = {
  addMember,
  removeMember,
  getMembers
}
