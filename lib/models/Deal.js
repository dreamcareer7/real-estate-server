const db = require('../utils/db.js')
const validator = require('../utils/validator.js')
const async = require('async')
const expect = validator.expect
const EventEmitter = require('events').EventEmitter


Deal = new EventEmitter

Orm.register('deal', Deal)

DealRole = {}

Orm.register('deal_role', DealRole)

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

  context: {
    type: 'object',
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

    if (!deal.context)
      deal.context = {}

    deal.context.type = 'deal_context'

    deal.cookies = AttachedFile.getCookies(id + '/*')

    cb(null, deal)
  })
}

Deal.create = function (deal, cb) {
  validate(deal, function (err) {
    if (err)
      return cb(err)

    db.query('deal/insert', [
      deal.created_by,
      deal.listing,
      deal.context
    ], (err, res) => {
      if (err)
        return cb(err)

      Deal.emit('deal created', deal)

      Deal.get(res.rows[0].id, cb)
    })
  })
}

Deal.update = function (deal, cb) {
  validate(deal, function (err) {
    if (err)
      return cb(err)

    db.query('deal/update', [
      deal.context,
      deal.id
    ], (err, res) => {
      if (err)
        return cb(err)

      Deal.get(deal.id, cb)
    })
  })
}

Deal.addRole = ({user, email, first_name, last_name, deal, role, created_by}, cb) => {
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

Deal.getBrandDeals = (brand_id, cb) => {
  db.query('deal/brand', [
    brand_id
  ], (err, res) => {
    if (err)
      return cb(err)

    async.map(res.rows.map(r => r.id), Deal.get, cb)
  })
}


Deal.delete = (deal_id, cb) => {
  async.auto({
    get: cb => {
      Deal.get(deal_id, cb)
    },
    delete: [
      'get',
      cb => {
        db.query('deal/delete', [deal_id], cb)
      }
    ],
  }, (err, results) => {
    if(err)
      return cb(err)

    return cb()
  })
}

Deal.associations = {
  listing: {
    optional: true,
    enabled: false,
    model: 'Listing'
  },

  roles: {
    collection: true,
    model: 'DealRole'
  },

  files: {
    collection: true,
    model: 'AttachedFile'
  },

  created_by: {
    enabled: false,
    model: 'User'
  }
}

DealRole.get = (id, cb) => {
  db.query('deal/role/get', [
    id
  ], (err, res) => {
    if (err)
      return cb(err)

    if (res.rows.length < 1)
      return cb(Error.ResourceNotFound('Deal role' + id + ' not found'))

    cb(null, res.rows[0])
  })
}

Deal.limitAccess = ({user, deal_id}, cb) => {
  Deal.get(deal_id, (err, deal) => {
    if (err)
      return cb(err)

    if (user.id === deal.created_by)
      return cb()

    Brand.limitAccess({
      user: user.id,
      brand: user.brand,
      action: 'Manage-Deals'
    }, err => {
      if (err)
        return cb(err)

      Brand.isChildOf(user.brand, deal.brand, (err, is) => {
        if (err)
          return cb(err)

        if (is)
          return cb()

        cb(Error.AccessForbidden())
      })
    })
  })
}

Deal.getContext = (deal, context) => {
  if (deal.context && deal.context[context])
    return deal.context[context]

  if (deal.proposed_values && deal.proposed_values[context])
    return deal.proposed_values[context]

  return null
}

DealRole.associations = {
  user: {
    enabled: true,
    model: 'User'
  }
}

module.exports = function () {}
