const validator = require('../../utils/validator.js')
const db = require('../../utils/db.js')
const expect = validator.expect

DealRole = {}

Orm.register('deal_role', 'DealRole')

DealRole.PERSON = 'Person'
DealRole.ORGANIZATION = 'Organization'

DealRole.get = async id => {
  const roles = await DealRole.getAll([id])

  if (roles.length < 1)
    throw Error.ResourceNotFound(`Deal role ${id} not found`)

  return roles[0]
}

DealRole.getAll = async ids => {
  const { rows } = await db.query.promise('deal/role/get', [ids])
  return rows
}

DealRole.delete = async id => {
  return db.query.promise('deal/role/remove', [id])
}

Deal.addRole = async ({
  user,
  brand,
  agent,
  role_type,
  legal_prefix,
  legal_first_name,
  legal_middle_name,
  legal_last_name,
  email,
  phone_number,
  current_address,
  future_address,
  deal,
  role,
  created_by,
  commission_dollar,
  commission_percentage,
  company_title,
  checklist
}) => {
  expect(deal).to.be.uuid
  expect(role).to.be.a('string')
  expect(created_by).to.be.uuid

  const { rows } = await db.query.promise('deal/role/add', [
    created_by,
    role_type || DealRole.PERSON,
    role,
    deal,
    user,
    brand,
    agent,
    company_title,
    legal_prefix,
    legal_first_name,
    legal_middle_name,
    legal_last_name,
    email,
    phone_number,
    current_address,
    future_address,
    commission_dollar,
    commission_percentage,
    checklist
  ])

  return rows[0].id
}

Deal.updateRole = async (role) => {
  const old = await DealRole.get(role.id)

  const updated = {}
  Object.assign(updated, old, role)

  await db.query.promise('deal/role/update', [
    updated.id,
    updated.role_type,
    updated.legal_prefix,
    updated.legal_first_name,
    updated.legal_middle_name,
    updated.legal_last_name,
    updated.user,
    updated.email,
    updated.agent,
    updated.phone_number,
    updated.current_address,
    updated.future_address,
    updated.company_title,
    updated.commission_dollar,
    updated.commission_percentage,
    updated.brokerwolf_id,
    updated.brokerwolf_row_version,
    updated.role
  ])
}

DealRole.associations = {
  user: {
    model: 'User',
    optional: true
  },

  agent: {
    model: 'Agent',
    optional: true
  }
}
