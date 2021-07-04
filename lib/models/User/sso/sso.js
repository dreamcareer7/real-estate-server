const emailParser = require('email-addresses').parseOneAddress

const db = require('../../../utils/db.js')

const BrandRole = {
  ...require('../../Brand/role/save'),
  ...require('../../Brand/role/members'),
}

const Brand     = require('../../Brand')

const User = require('../../User/get')

const { get: getUser } = require('../get')
const { getByIdentifier } = require('./get')


const getUserByProvider = async (provider, foreign_id) => {
  const { rows } = await db.query.promise('user/sso/get-user', [provider, foreign_id])

  if (rows.length < 1) {
    return false
  }

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

const checkDomain = (domain, email) => {
  const parsed = emailParser(email)

  if (!parsed)
    throw new Error('Invalid incoming email on SAML')

  return parsed.domain.toLowerCase() === domain.toLowerCase()
}

const connectUser = async ({user: user_id, provider: provider_id, foreign_id, profile, trusted, brand }) => {
  const provider = await getByIdentifier(provider_id)

  const user = await User.get(user_id)

  if (brand && provider.brand && provider.create_brand)
    await createBrandForUser(user_id, provider.brand)

  if (!trusted && provider.domain)
    trusted = checkDomain(provider.domain, user.email)

  await db.query.promise('user/sso/connect', [
    user.id,
    provider.id,
    foreign_id,
    profile,
    trusted
  ])

  return trusted
}


module.exports = {
  getUser: getUserByProvider,
  connectUser
}
