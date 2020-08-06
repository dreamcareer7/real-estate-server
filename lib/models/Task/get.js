const db = require('../../utils/db')


const getAll = async ids => {
  const res = await db.query.promise('task/get', [ids])

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