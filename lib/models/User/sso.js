const db = require('../../utils/db.js')

const SsoProvider = {}
Orm.register('sso_provider', 'SsoProvider', SsoProvider)

SsoProvider.get = async id => {
  const providers = await SsoProvider.getAll([id])

  if (providers.length < 1)
    return new Error.ResourceNotFound(`SSO Provider ${id} not found`)

  return providers[0]
}

SsoProvider.getAll = async ids => {
  const { rows } = await db.query.promise('user/sso/provider/get', [
    ids
  ])

  return rows
}

SsoProvider.getByIdentifier = async identifier => {
  const { rows } = await db.query.promise('user/sso/provider/get-by-identifier', [
    identifier
  ])

  if (rows.length < 1)
    throw new Error.ResourceNotFound(`Could find SSO provider ${identifier}`)

  return rows[0]
}

SsoProvider.getByUser = async user => {
  const { rows } = await db.query.promise('user/sso/provider/get-by-user', [
    user.id
  ])

  const ids = rows.map(r => r.id)
  return SsoProvider.getAll(ids)
}

User.getBySso = async (provider, foreign_id) => {
  const { rows } = await db.query.promise('user/sso/get-user', [
    provider,
    foreign_id
  ])

  if (rows.length < 1)
    return false

  return rows[0]
}

User.connectSso = async ({
  user,
  provider,
  foreign_id,
  profile,
  trusted
}) => {
  await db.query.promise('user/sso/connect', [
    user,
    provider,
    foreign_id,
    profile,
    trusted
  ])
}

module.exports = SsoProvider
