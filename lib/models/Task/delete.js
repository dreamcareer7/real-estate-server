const db = require('../../utils/db')

const { getAll } = require('./get')


const deleteAll = async ids => {
  await db.query.promise('task/delete', [ids])

  return getAll(ids)
}

const deleteOne = async id => {
  const tasks = await getAll([id])
  
  if (tasks.length < 1) {
    throw Error.ResourceNotFound(`Task ${id} not found`)
  }

  return deleteAll([id])
}


module.exports = {
  deleteAll,
  delete: deleteOne
}