const validator = require('../../utils/validator.js')
const promisify = require('../../utils/promisify')
const db = require('../../utils/db.js')
const expect = validator.expect


DealRole = {}

Orm.register('deal_role', 'DealRole')

DealRole.get = (id, cb) => {
  DealRole.getAll([id], (err, roles) => {
    if (err)
      return cb(err)

    if (roles.length < 1)
      return cb(Error.ResourceNotFound('Deal role' + id + ' not found'))

    const role = roles[0]
    cb(null, role)
  })
}

DealRole.getAll = (role_ids, cb) => {
  db.query('deal/role/get', [role_ids], (err, res) => {
    if (err)
      return cb(err)

    const roles = res.rows

    return cb(null, roles)
  })
}

DealRole.delete = (role_id, cb) => {
  db.query('deal/role/remove', [role_id], cb)
}

Deal.addRole = ({
  user,
  legal_prefix,
  legal_first_name,
  legal_middle_name,
  legal_last_name,
  email,
  phone_number,
  deal,
  role,
  created_by,
  commission_dollar,
  commission_percentage,
  company_title
}, cb) => {
  expect(deal).to.be.uuid
  expect(role).to.be.a('string')
  expect(created_by).to.be.uuid

  db.query('deal/role/add', [
    created_by,
    role,
    deal,
    user,
    company_title,
    legal_prefix,
    legal_first_name,
    legal_middle_name,
    legal_last_name,
    email,
    phone_number,
    commission_dollar,
    commission_percentage
  ], cb)
}

Deal.updateRole = async (role) => {
  const old = await promisify(DealRole.get)(role.id)

  const updated = {}
  Object.assign(updated, old, role)

  await db.query.promise('deal/role/update', [
    updated.id,
    updated.legal_prefix,
    updated.legal_first_name,
    updated.legal_middle_name,
    updated.legal_last_name,
    updated.user,
    updated.email,
    updated.phone_number,
    updated.company_title,
    updated.commission_dollar,
    updated.commission_percentage,
    updated.brokerwolf_id,
    updated.brokerwolf_row_version
  ])
}

DealRole.associations = {
  user: {
    model: 'User',
    optional: true
  }
}
