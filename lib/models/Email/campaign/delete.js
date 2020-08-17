const db     = require('../../../utils/db')
const { notify } = require('./notify')
const { DELETE_EVENT } = require('./constants')

const deleteMany = async (ids, user, brand) => {
  await db.update('email/campaign/delete', [
    ids
  ])

  notify(
    DELETE_EVENT,
    user.id,
    brand,
    ids
  )
}

module.exports = {
  deleteMany,
}
