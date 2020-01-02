const db = require('../../utils/db.js')

User.getBySso = async (source, foreign_id) => {
  const { rows } = await db.query.promise('user/sso/get', [
    source,
    foreign_id
  ])

  if (rows.length < 1)
    throw new Error.ResourceNotFound('Could find SSO profile')

  return rows[0]
}

User.connectSso = async ({
  user,
  source,
  foreign_id,
  profile
}) => {
  await db.query.promise('user/sso/connect', [
    user,
    source,
    foreign_id,
    profile
  ])
}

User.getSsoProviderByIdentifier = async identifier => {
  const { rows } = await db.query.promise('user/sso/provider/get-by-identifier', [
    identifier
  ])

  if (rows.length < 1)
    throw new Error.ResourceNotFound(`Could find SSO provider ${identifier}`)

  return rows[0]
}
