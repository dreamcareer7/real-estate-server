const db = require('../../../utils/db.js')


const getAll = async (ids) => {
  const showings = await db.select('showings.com/get', [ids])

  return showings
}

const get = async (id) => {
  const showings = await getAll([id])

  if (showings.length < 1)
    throw Error.ResourceNotFound(`showings ${id} not found`)

  return showings[0]
}

const getByRemoteId = async (remoteId) => {
  const ids = await db.selectIds('showings.com/get_by_remote_id', [remoteId])

  if (ids.length < 1)
    throw Error.ResourceNotFound('showing not found.')

  return get(ids[0])
}

const getOneByCredential = async (credentialId) => {
  const ids = await db.selectIds('showings.com/get_by_credential', [credentialId])

  if (ids.length < 1)
    throw Error.ResourceNotFound(`showings by agent ${credentialId} not found`)

  return get(ids[0])
}

const getManyByCredential = async (credentialId) => {
  const ids = await db.selectIds('showings.com/get_by_credential', [credentialId])

  return getAll(ids)
}


module.exports = {
  getAll,
  get,
  getByRemoteId,
  getOneByCredential,
  getManyByCredential
}
