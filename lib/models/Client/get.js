const db = require('../../utils/db.js')

const get = async id => {
  const clients = await getAll([id])

  if (clients.length < 1)
    throw Error.ResourceNotFound(`Client ${id} not found`)

  return clients[0]
}

const getAll = async client_ids => {
  const res = await db.query.promise('client/get', [client_ids])
  return res.rows
}

const getDefault = async () => {
  const [ id ] = await db.selectIds('client/default')
  return get(id)
}

module.exports = {
  get,
  getAll,
  getDefault
}
