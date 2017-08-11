const db = require('../../utils/db.js')
const validator = require('../../utils/validator.js')
const async = require('async')
const EventEmitter = require('events').EventEmitter
const parser = require('parse-address').parseLocation

Deal = new EventEmitter
Orm.register('deal', 'Deal')

require('./dcad')
require('./role')
require('./checklist')


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
  const brand = Brand.getCurrent()

  const insert = cb => {
    db.query('deal/insert', [
      deal.created_by,
      deal.listing,
      deal.context,
      deal.deal_type,
      deal.property_type,
      brand.id
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

    DealChecklist.addChecklists(saved).nodeify(cb)
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

  checklists: {
    collection: true,
    model: 'DealChecklist'
  },

  created_by: {
    enabled: false,
    model: 'User'
  }
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

module.exports = function () {}
