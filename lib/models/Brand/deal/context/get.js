const db = require('../../../../utils/db')

const get = async id => {
  const contexts = await getAll([id])
  if (contexts.length < 1)
    throw Error.ResourceNotFound(`Brand Context ${id} not found`)

  return contexts[0]
}

const getAll = async ids => {
  const res = await db.query.promise('brand/context/get', [ids])
  return res.rows
}

module.exports = {
  get,
  getAll
}
