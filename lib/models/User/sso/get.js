const db = require('../../../utils/db.js')


const get = async id => {
  const providers = await getAll([id])

  if (providers.length < 1) {
    return Error.ResourceNotFound(`SSO Provider ${id} not found`)
  }

  return providers[0]
}

const getAll = async ids => {
  const { rows } = await db.query.promise('user/sso/provider/get', [ids])

  return rows
}

const getByIdentifier = async identifier => {
  const { rows } = await db.query.promise('user/sso/provider/get-by-identifier', [
    identifier
  ])

  if (rows.length < 1) {
    throw Error.ResourceNotFound(`Could find SSO provider ${identifier}`)
  }

  return rows[0]
}

const getByUser = async user => {
  const { rows } = await db.query.promise('user/sso/provider/get-by-user', [user.id])

  const ids = rows.map(r => r.provider)

  return getAll(ids)
}


module.exports = {
  get,
  getAll,
  getByIdentifier,
  getByUser
}