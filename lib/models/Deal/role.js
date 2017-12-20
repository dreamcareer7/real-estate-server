const validator = require('../../utils/validator.js')
const promisify = require('../../utils/promisify')
const db = require('../../utils/db.js')
const async = require('async')
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
  email,
  legal_prefix,
  legal_first_name,
  legal_middle_name,
  legal_last_name,
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

  const getDeal = cb => {
    Deal.get(deal, cb)
  }

  const getUser = cb => {
    if (user) {
      expect(user).to.be.uuid
      User.get(user, cb)
      return
    }

    if (email) {
      expect(email).to.be.a('string')

      User.getOrCreateByEmail(email, {legal_first_name, legal_last_name}, cb)
      return
    }

    cb(Error.Validation('Please provide either email or user'))
  }

  const insert = (cb, results) => {
    db.query('deal/role/add', [
      created_by,
      role,
      deal,
      results.user.id,
      company_title,
      legal_prefix,
      legal_first_name,
      legal_middle_name,
      legal_last_name,
      commission_dollar,
      commission_percentage
    ], cb)
  }

  const done = (err, results) => {
    if (err)
      return cb(err)

    cb()
  }

  async.auto({
    deal: getDeal,
    user: getUser,
    insert: ['deal', 'user', insert],
  }, done)
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
    updated.company_title,
    updated.commission_dollar,
    updated.commission_percentage,
    updated.brokerwolf_id,
    updated.brokerwolf_row_version
  ])
}

DealRole.associations = {
  user: {
    enabled: true,
    model: 'User'
  }
}
