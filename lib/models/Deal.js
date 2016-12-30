const db = require('../utils/db.js')
const validator = require('../utils/validator.js')
const async = require('async')
const expect = validator.expect

Deal = {}

Orm.register('deal', Deal)

const schema = {
  type: 'object',

  listing: {
    type: 'string',
    uuid: true,
    required: false
  },

  created_by: {
    type: 'string',
    uuid: true,
    required: true
  },

  deal_type: {
    type: 'string',
    required: true,
    enum: ['Selling', 'Buying']
  },

  address: {
    type: 'string',
    required: false
  }
}

const validate = validator.bind(null, schema)

Deal.get = function (id, cb) {
  db.query('deal/get', [id], (err, res) => {
    if (err)
      return cb(err)

    if (res.rows.length < 1)
      return cb(Error.ResourceNotFound('Deal ' + id + ' not found'))

    const deal = res.rows[0]
    organizeRoles(deal)
    cb(null, deal)
  })
}

function organizeRoles (deal) {
  if (!deal.roles)
    return

  const roles = JSON.parse(JSON.stringify(deal.roles))
  deal.roles = {}

  roles.forEach(r => {
    if (!deal.roles[r.role])
      deal.roles[r.role] = []

    deal.roles[r.role].push(r.user)
  })
}

Deal.create = function (deal, cb) {
  validate(deal, function (err) {
    if (err)
      return cb(err)

    db.query('deal/insert', [
      deal.created_by,
      deal.listing,
      deal.deal_type,
      deal.address
    ], (err, res) => {
      if (err)
        return cb(err)

      Deal.get(res.rows[0].id, cb)
    })
  })
}

Deal.addRole = ({user, email, deal, role, created_by}, cb) => {
  expect(deal).to.be.uuid
  expect(role).to.be.a('string')
  expect(created_by).to.be.uuid

  const getDeal = cb => {
    Deal.get(deal, cb)
  }

  const check = (cb, results) => {
    if (results.deal.created_by !== created_by)
      return cb(Error.AccessForbidden())

    cb()
  }

  const getUser = cb => {
    if (user) {
      expect(user).to.be.uuid
      User.get(user, cb)
      return
    }

    if (email) {
      expect(email).to.be.a('string')

      User.getOrCreateByEmail(email, cb)
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

    Deal.get(deal, cb)
  }

  async.auto({
    deal: getDeal,
    check: ['deal', check],
    user: getUser,
    insert: ['deal', 'user', insert],
  }, done)
}

Deal.getUserDeals = (user_id, cb) => {
  db.query('deal/user', [
    user_id
  ], (err, res) => {
    if (err)
      return cb(err)

    async.map(res.rows.map(r => r.id), Deal.get, cb)
  })
}

Deal.associations = {
  listing: {
    optional: true,
    enabled: false,
    model: 'Listing'
  }
}

module.exports = function () {}