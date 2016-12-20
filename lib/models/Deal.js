const db = require('../utils/db.js')
const validator = require('../utils/validator.js')
const async = require('async')
const expect = validator.expect

Deal = {}

Orm.register('Deal', Deal)

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
      deal.deal_type
    ], (err, res) => {
      if (err)
        return cb(err)

      Deal.get(res.rows[0].id, cb)
    })
  })
}

Deal.addRole = ({user, deal, role, created_by}, cb) => {
  expect(user).to.be.uuid
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

  const insert = cb => {
    db.query('deal/role/add', [
      created_by,
      role,
      deal,
      user
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
    insert: ['deal', insert],
  }, done)
}

module.exports = function () {}