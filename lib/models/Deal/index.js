const db = require('../../utils/db.js')
const validator = require('../../utils/validator.js')
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

const validate = validator.promise.bind(null, schema)

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
      if (!r.context)
        r.context = {}

      r.email = Deal.Email.getAddress(r)

      return r
    })

    return cb(null, deals)
  })
}

Deal.publicize = deal => {
  deal.context.type = 'deal_context'
}

Deal.create = async (deal, cb) => {
  await validate(deal)

  const brand = Brand.getCurrent()

  const res = await db.query.promise('deal/insert', [
    deal.created_by,
    deal.listing,
    deal.is_draft || false,
    deal.deal_type,
    deal.property_type,
    brand.id
  ])

  const saved = await promisify(Deal.get)(res.rows[0].id)

  const final = await Deal.updateTitle(saved)

  Deal.emit('deal created', final)

  return final
}

Deal.update = async deal => {
  return db.update('deal/update', [
    deal.id,
    deal.listing,
    deal.is_draft,
    deal.title
  ])
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

Deal.delete = async id => {
  await db.query.promise('deal/delete', [id])
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

Deal.limitAccess = async ({user, deal_id, roles}) => {
  const deal = await promisify(Deal.get)(deal_id)

  const { has_access } = await db.selectOne('deal/has-access', [
    deal_id,
    user.id,
  ])

  if (!has_access)
    throw Error.Forbidden(`Access denied for ${user.display_name} to deal ${deal.title}`)
}

Deal.getByNumber = async number => {
  const row = await db.selectOne('deal/by-number', [number])
  return promisify(Deal.get)(row.id)
}

const generateTitle = async deal => {
  const address = Deal.getContext(deal, 'street_address')

  if (address)
    return address

  const relevant_roles = deal.deal_type === 'Buying' ? [
    'Buyer',
    'BuyerPowerOfAttorney',
    'Landlord'
  ] : [
    'Seller',
    'SellerPowerOfAttorney',
    'Tenant'
  ]

  // Address not found. We need to generate a name using client names

  const all_roles = await DealRole.getAll(deal.roles)
  const roles = all_roles.filter(role => {
    return relevant_roles.includes(role.role)
  })

  if (roles.length < 1)
    return '[Draft]'

  return roles.map(r => r.legal_full_name).join(', ')
}

Deal.updateTitle = async deal => {
  const title = await generateTitle(deal)

  if (deal.title === title)
    return deal

  deal.title = title
  await Deal.update(deal)

  return promisify(Deal.get)(deal.id)
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

Deal.getShortAddress = deal => {
  let address = [
    Deal.getContext(deal, 'street_number'),
    Deal.getContext(deal, 'street_name')
  ].join(' ')

  if (address.length > 10)
    address = `${address.substr(0, 10)}…`

  return address
}

Deal.getStreetAddress = deal => {
  const address = [
    Deal.getContext(deal, 'street_number'),
    Deal.getContext(deal, 'street_dir_prefix'),
    Deal.getContext(deal, 'street_name'),
    Deal.getContext(deal, 'street_suffix')
  ].join(' ')

  return address
}

Notification.addDecorator(setNotificationDeal)

module.exports = Deal
