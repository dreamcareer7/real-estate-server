const db = require('../../utils/db.js')
const validator = require('../../utils/validator.js')
const async = require('async')
const expect = validator.expect
const EventEmitter = require('events').EventEmitter
const parser = require('parse-address').parseLocation

Deal = new EventEmitter

require('./dcad')

Orm.register('deal', 'Deal')

DealRole = {}

Orm.register('deal_role', 'DealRole')

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
  Deal.getAll([id], (err, deals) => {
    if(err)
      return cb(err)

    if (deals.length < 1)
      return cb(Error.ResourceNotFound(`Deal ${id} not found`))

    const deal = deals[0]

    return cb(null, deal)
  })
}

Deal.getAll = function(deal_ids, cb) {
  db.query('deal/get', [deal_ids], (err, res) => {
    if (err)
      return cb(err)

    const deals = res.rows.map(r => {
      if(!r.context)
        r.context = {}

      r.context.type = 'deal_context'

      return r
    })

    return cb(null, deals)
  })
}

Deal.create = function (deal, cb) {
  const insert = cb => {
    db.query('deal/insert', [
      deal.created_by,
      deal.listing,
      deal.context,
      deal.flags
    ], cb)
  }

  const get = (cb, results) => {
    Deal.get(results.insert.rows[0].id, cb)
  }

  const scrape = (cb, results) => {
    Deal.scrape(results.deal, cb)
  }

  const tasks = (cb, results) => {
    const saved = results.insert.rows[0]

    Task.addBrandTasks({
      brand_id: saved.brand,
      deal_id: saved.id,
      flags: saved.flags
    }).nodeify(cb)
  }

  const done = (err, results) => {
    if (err)
      return cb(err)

    Deal.emit('deal created', results.final)

    cb(null, results.final)
  }

  Deal.expand(deal)

  async.auto({
    validate: cb => validate(deal, cb),
    insert: ['validate', insert],
    tasks: ['insert', tasks],
    deal: ['insert', get],
    scrape: ['deal', scrape],
    final: ['scrape', 'tasks', get],
  }, done)
}

Deal.update = function (deal, cb) {

  const get = cb => Deal.get(deal.id, cb)

  const update = cb => {
    db.query('deal/update', [
      deal.context,
      deal.flags,
      deal.id
    ], cb)
  }

  const scrape = (cb, results) => {
    const old = results.old

    // If any of these context fields (or listing) have changed, we should scrape DCAP again
    const address_fields = [
      'street_number',
      'street_dir_prefix',
      'street_name',
      'street_suffix',
      'postal_code',
      'unit_number',
      'full_address'
    ]

    const relevantChange = address_fields.every(field => {
      return Deal.getContext(deal, field) !== Deal.getContext(old, field)
    })

    if (deal.listing === old.listing && !relevantChange)
      return cb()

    Deal.scrape(deal, cb)
  }

  const done = (err, results) => {
    if (err)
      return cb(err)

    get(cb)
  }

  Deal.expand(deal)

  async.auto({
    validate: cb => validate(deal, cb),
    old: ['validate', get],
    update: ['old', update],
    scrape: ['update', scrape]
  }, done)
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
      return cb(Error.Forbidden())

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

    Deal.getAll(res.rows.map(r => r.id), cb)
  })
}

Deal.getBrandDeals = (brand_id, cb) => {
  db.query('deal/brand', [
    brand_id
  ], (err, res) => {
    if (err)
      return cb(err)

    Deal.getAll(res.rows.map(r => r.id), cb)
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
  roles: {
    collection: true,
    model: 'DealRole'
  },

  tasks: {
    collection: true,
    model: 'Task'
  },

  created_by: {
    enabled: false,
    model: 'User'
  }
}

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

Deal.limitAccess = ({user, deal_id}, cb) => {
  Deal.get(deal_id, (err, deal) => {
    if (err)
      return cb(err)

    if (user.id === deal.created_by)
      return cb()

    Brand.limitAccess({
      user: user.id,
      brand: user.brand
    }).nodeify(err => {
      if (err)
        return cb(err)

      Brand.isChildOf(user.brand, deal.brand).nodeify((err, is) => {
        if (err)
          return cb(err)

        if (is)
          return cb()

        cb(Error.Forbidden())
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

Deal.expand = deal => {
  deal.flags = []
  deal.flags.push(Deal.getContext(deal, 'deal_type'))

  if (deal.listing) //Its connected to MLS. Dont try extracting address info
    return

  const address = Deal.getContext(deal, 'full_address')

  const parsed = parser(address)
  if (!parsed) {
    deal.context.street_address = address
    return
  }

  const street_address = []

  if (!deal.context)
    deal.context = {}

  if (parsed.number) {
    deal.context.street_number = parsed.number
    street_address.push(parsed.number)
  }

  if (parsed.prefix) {
    deal.context.street_dir_prefix = parsed.prefix
    street_address.push(parsed.prefix)
  }

  if (parsed.street) {
    deal.context.street_name = parsed.street
    street_address.push(parsed.street)
  }

  if (parsed.type) {
    deal.context.street_suffix = parsed.type
    street_address.push(parsed.type)
  }

  deal.context.street_address = street_address.join(' ')

  if (parsed.city)
    deal.context.city = parsed.city

  if (parsed.zip)
    deal.context.postal_code = parsed.zip

  if (parsed.state)
    deal.context.state_code = parsed.state

  if (parsed.sec_unit_num)
    deal.context.unit_number = parsed.sec_unit_num
}

DealRole.associations = {
  user: {
    enabled: true,
    model: 'User'
  }
}

module.exports = function () {}
