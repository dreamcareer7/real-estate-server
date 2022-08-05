const db = require('../../utils/db')
const ObjectUtil = require('../ObjectUtil')

const getAll = async ids => {
  const user_id = ObjectUtil.getCurrentUser()
  const res = await db.query.promise('task/get', [ids, user_id])

  return res.rows
}

const get = async id => {
  const tasks = await getAll([id])

  if (tasks.length < 1) {
    throw Error.ResourceNotFound(`Task ${id} not found`)
  }

  return tasks[0]
}


module.exports = {
  getAll,
  get
}
