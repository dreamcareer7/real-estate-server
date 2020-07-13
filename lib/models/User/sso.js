const db = require('../../utils/db.js')
const BrandRole = require('../Brand/role')
const Brand = require('../Brand')
const Orm = require('../Orm/registry')
const Url = require('../Url')

const {
  get: getUser
} = require('./get')

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

  const ids = rows.map(r => r.provider)
  return SsoProvider.getAll(ids)
}

SsoProvider.publicize = model => {
  model.url = Url.api({
    uri: `/auth/saml/${model.id}`
  })

  delete model.config
  delete model.client
  delete model.identifier
}

SsoProvider.getUser = async (provider, foreign_id) => {
  const { rows } = await db.query.promise('user/sso/get-user', [
    provider,
    foreign_id
  ])

  if (rows.length < 1)
    return false

  return rows[0]
}

const createBrandForUser = async (user_id, parent) => {
  const user = await getUser(user_id)
  const name = `${user.display_name}'s Team`

  const brand = await Brand.create({
    name,
    parent,
    brand_type: Brand.PERSONAL
  })

  const role = await BrandRole.create({
    brand: brand.id,
    role: 'Agent',
    acl: ['Deals', 'Marketing', 'CRM']
  })

  await BrandRole.addMember({
    role: role.id,
    user: user.id
  })
}

SsoProvider.connectUser = async ({
  user,
  provider,
  foreign_id,
  profile,
  trusted,
  brand
}) => {
  const sso_provider = await SsoProvider.getByIdentifier(provider)

  if (brand && sso_provider.brand)
    await createBrandForUser(user, sso_provider.brand)

  await db.query.promise('user/sso/connect', [
    user,
    sso_provider.id,
    foreign_id,
    profile,
    trusted
  ])
}

module.exports = SsoProvider
