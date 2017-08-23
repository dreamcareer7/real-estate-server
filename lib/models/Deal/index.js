const db = require('../../utils/db.js')
const validator = require('../../utils/validator.js')
const async = require('async')
const EventEmitter = require('events').EventEmitter

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
      if(!r.deal_context)
        r.deal_context = {}

      r.deal_context.type = 'deal_context'

      if(!r.form_context)
        r.form_context = {}

      r.form_context.type = 'form_context'


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
      deal.deal_type,
      deal.property_type,
      brand.id
    ], cb)
  }

  const context = (cb, results) => {
    if (!deal.deal_context)
      return cb()

    Deal.saveContext({
      deal: results.insert.rows[0].id,
      user: deal.created_by,
      context: deal.deal_context
    }, cb)
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

  async.auto({
    validate: cb => validate(deal, cb),
    insert: ['validate', insert],
    context: ['insert', context],
    tasks: ['context', tasks],
    deal: ['context', get],
    scrape: ['deal', scrape],
    final: ['scrape', 'tasks', get],
  }, done)
}

Deal.update = (deal, cb) => {
  db.query('deal/update', [
    deal.id,
    deal.listing
  ], cb)
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

Deal.getBrandInbox = (brand_id, cb) => {
  db.query('deal/brand_inbox', [
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
  },

  brand: {
    model: 'Brand',
    enabled: true
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

Deal.getContext = (deal, key) => {
  if (deal.mls_context && deal.mls_context[key])
    return deal.mls_context[key]

  const mls_context = deal.mls_context ? deal.mls_context[key] : undefined
  const form_context = deal.form_context ? deal.form_context[key] : undefined
  const deal_context = deal.deal_context ? deal.deal_context[key] : undefined

  if (mls_context)
    return mls_context

  if (deal_context)
    return deal_context.value

  if (form_context)
    return form_context.value

  return null
}

const insertContext = ({deal, key, value, user}, cb) => {
  db.query('deal/context/insert', [
    deal,
    user,
    key,
    value
  ], cb)
}

Deal.saveContext = ({deal, user, context}, cb) => {
  async.forEach(Object.keys(context), (key, cb) => {
    const c = {
      key,
      value: context[key],
      deal,
      user,
    }
    insertContext(c, cb)
  }, cb)
}


module.exports = function () {}
