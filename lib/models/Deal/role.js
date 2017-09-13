const validator = require('../../utils/validator.js')
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

Deal.addRole = ({user, email, first_name, last_name, deal, role, created_by}, cb) => {
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

      User.getOrCreateByEmail(email, {first_name, last_name}, cb)
      return
    }

    cb(Error.Validation('Please provide either email or user'))
  }

  const insert = (cb, results) => {
    db.query('deal/role/add', [
      created_by,
      role,
      deal,
      results.user.id
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

DealRole.associations = {
  user: {
    enabled: true,
    model: 'User'
  }
}
