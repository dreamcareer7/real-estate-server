const db = require('../../utils/db.js')
const validator = require('../../utils/validator.js')
const async = require('async')
const EventEmitter = require('events').EventEmitter
const promisify = require('../../utils/promisify')

Deal = new EventEmitter


Orm.register('deal', 'Deal')

Deal.AGENT_DOUBLE_ENDER = 'AgentDoubleEnder'
Deal.OFFICE_DOUBLE_ENDER = 'OfficeDoubleEnder'

Deal.BUYING = 'Buying'
Deal.SELLING = 'Selling'

Deal.RESALE = 'Resale'
Deal.NEW_HOME = 'New Home'
Deal.LOT = 'Lot / Land'
Deal.RESIDENTIAL_LEASE = 'Residential Lease'
Deal.COMMERCIAL_SALE = 'Commercial Sale'
Deal.COMMERCIAL_LEASE = 'Commercial Lease'

require('./dcad')
require('./role')
require('./checklist')
require('./live')
require('./filter')
require('./brokerwolf')
require('./context')
require('./email')

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
  const user_id = ObjectUtil.getCurrentUser()

  db.query('deal/get', [deal_ids, user_id], (err, res) => {
    if (err)
      return cb(err)

    const deals = res.rows.map(r => {
      if(!r.deal_context)
        r.deal_context = {}

      r.deal_context.type = 'deal_context'

      r.email = Deal.Email.getAddress(r)

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
    }).nodeify(cb)
  }

  const addRole = ({role, deal_id}, cb) => {
    role.created_by = deal.created_by
    role.deal = deal_id

    Deal.addRole(role, cb)
  }

  const roles = (cb, results) => {
    if (!deal.roles)
      return cb()

    async.eachSeries(deal.roles, (role, cb) => {
      addRole({
        deal_id: results.insert.rows[0].id,
        role
      }, cb)
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

  const activity = (cb, results) => {
    const deal = results.final

    const activity = {
      action: 'UserCreatedDeal',
      object: deal.id,
      object_class: 'deal'
    }

    Activity.add(deal.created_by, 'User', activity, cb)
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
    roles: ['insert', roles],
    tasks: ['context', tasks],
    deal: ['context', get],
    scrape: ['deal', scrape],
    final: ['scrape', 'roles', 'tasks', get],
    activity: ['final', activity],
  }, done)
}

Deal.update = (deal, cb) => {
  db.query('deal/update', [
    deal.id,
    deal.listing,
    deal.brokerwolf_id,
    deal.brokerwolf_tier_id,
    deal.brokerwolf_row_version
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

Deal.getByRoom = async room_id => {
  const res = await db.query.promise('deal/by_room', [room_id])
  if (res.rows.length < 1)
    throw new Error.ResourceNotFound(`Cannot find deal of room ${room_id}`)

  return res.rows[0].deal
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
    enabled: false,
    model: 'DealChecklist'
  },

  created_by: {
    enabled: false,
    model: 'User'
  },

  brand: {
    model: 'Brand',
    enabled: false
  },

  envelopes: {
    model: 'Envelope',
    collection: true,
    enabled: false
  },

  files: {
    collection: true,
    enabled: false,
    model: 'AttachedFile'
  }
}

Deal.limitAccess = ({user, deal_id}, cb) => {
  Deal.get(deal_id, (err, deal) => {
    if (err)
      return cb(err)

    Brand.limitAccess({
      user: user.id,
      brand: deal.brand
    }).nodeify(cb)
  })
}

/**
 * Checks user access to a number of deals
 * @param {UUID} user_id 
 * @param {any[]} deals 
 * @returns {Promise<{[x: UUID]: boolean}>}
 */
Deal.hasAccessToDeals = async (user_id, deals) => {
  const brands = new Set(deals.map(d => d.brand))
  const brand_access = await Brand.hasAccessToBrands(brands, user_id)

  const deals_access = {}
  for (const deal of deals) {
    deals_access[deal.id] = brand_access[deal.brand]
  }

  return deals_access
}

Deal.getByNumber = async number => {
  const row = await db.selectOne('deal/by-number', [number])
  return promisify(Deal.get)(row.id)
}

const setNotificationDeal = async ({notification, room}) => {
  if (!room)
    return

  if (room.room_type !== 'Task')
    return

  const deal_id = await Deal.getByRoom(room.id)
  notification.auxiliary_subject_class = 'Deal'
  notification.auxiliary_subject = deal_id
}

Notification.addDecorator(setNotificationDeal)

module.exports = function () {}
