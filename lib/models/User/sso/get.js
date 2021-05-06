const db = require('../../../utils/db.js')
const emailParser = require('email-addresses').parseOneAddress

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

const getByEmail = async email => {
  const parsed = emailParser(email)

  if (!parsed)
    return

  const row = await db.selectOne('user/sso/provider/get-by-domain', [parsed.domain])

  if (!row)
    return

  return get(row.id)
}

module.exports = {
  get,
  getAll,
  getByIdentifier,
  getByUser,
  getByEmail
}
