const db = require('../../utils/db')

const get = async function(id) {
  const activities = await getAll([id])

  if(activities.length < 1) {
    throw Error.ResourceNotFound(`Activity ${id} not found`)
  }

  return activities[0]
}

const getAll = async function(ids) {
  return db.select('activity/get', [ids])
}

module.exports = {
  get,
  getAll
}
