const db = require('../../utils/db')

const get = async id => {
  const open_houses = await getAll([id])

  if (open_houses.length < 1)
    throw Error.ResourceNotFound('OpenHouse ' + id + ' not found')

  return open_houses[0]
}

const getAll = async ids => {
  const res = await db.query.promise('open_house/get', [ids])

  return res.rows
}


module.exports = {
  get,
  getAll
}
