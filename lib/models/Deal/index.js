const db = require('../../utils/db.js')
const validator = require('../../utils/validator.js')
const EventEmitter = require('events').EventEmitter
const promisify = require('../../utils/promisify')
const Notification = require('../Notification/create')

const DealRole = require('./role')

const Deal = new EventEmitter

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

const { getContext } = require('./context/get')
const { saveContext, setContextApproval } = require('./context')

Object.assign(Deal, {
  ...require('./get'),
  ...require('./live'),
  ...require('./constants'),
  ...require('./filter'),
  ...require('./access'),
  ...require('./form'),
  ...require('./zip'),
  getContext,
  saveContext,
  setContextApproval
})

Deal.Email = {
  ...require('./email'),
  ...require('./email/address')
}

Deal.BrokerWolf = {
  ...require('./brokerwolf')
}

Deal.create = async (deal, cb) => {
  await validate(deal)

  const res = await db.query.promise('deal/insert', [
    deal.created_by,
    deal.listing,
    deal.is_draft || false,
    deal.deal_type,
    deal.property_type,
    deal.brand
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
    deal.title,
    deal.property_type
  ])
}

Deal.delete = async id => {
  await db.query.promise('deal/delete', [id])
}

const generateTitle = async deal => {
  const address = getContext(deal, 'street_address')

  if (address)
    return address

  const relevant_roles = deal.deal_type === 'Buying' ? [
    'Buyer',
    'BuyerPowerOfAttorney',
    'Tenant',
    'TenantPowerOfAttorney',
  ] : [
    'Seller',
    'SellerPowerOfAttorney',
    'Landlord',
    'LandlordPowerOfAttorney',
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

  Deal.emit('update:title', { deal: deal.id, title })

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

Notification.addDecorator(setNotificationDeal)

module.exports = Deal
