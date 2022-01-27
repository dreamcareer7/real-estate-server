const request = require('request-promise-native')
const moment = require('moment')
const _ = require('lodash')


const db = require('../../../utils/db')
const { peanar } = require('../../../utils/peanar')

const Context = require('../../Context')

const BrandPropertyType = require('../../Brand/deal/property_type/get')
const DealRole = require('../role/get')
const Deal = {
  ...require('../context/get'),
  ...require('../constants'),
}

const Brand = {
  ...require('../../Brand/get'),
  ...require('../../Brand/constants')
}

const BrandStatus = require('../../Brand/deal/status/get')

const getState = async deal => {
  const { rows } = await db.executeSql.promise('SELECT * FROM de.deals WHERE deal = $1', [deal])
  const [ row ] = rows
  return row
}

const STATUS_CLOSED = 'Closed'
const STATUS_PENDING = 'Pending'
const STATUS_ARCHIVED = 'Archived'

const getStatus = async deal => {
  const contract_status = Deal.getContext(deal, 'contract_status')

  if (!contract_status)
    return

  const statuses = await BrandStatus.getByBrand(deal.brand)
  const status = _.find(statuses, {label: contract_status})

  if (!status)
    return false

  if (status.is_closed)
    return STATUS_CLOSED

  if (status.is_archived)
    return STATUS_ARCHIVED

  if (status.is_pending)
    return STATUS_PENDING

  return false
}

const getAgent = ({deal, roles}) => {
  if (deal.deal_type === Deal.BUYING)
    return _.find(roles, {role: 'BuyerAgent'})
  else
    return _.find(roles, {role: 'SellerAgent'})
}

const getClient = ({deal, roles, property_type}) => {
  if (deal.deal_type === Deal.BUYING)
    if (property_type.is_lease)
      return _.find(roles, {role: 'Tenant'})
    else
      return _.find(roles, {role: 'Buyer'})
  else
    if (property_type.is_lease)
      return _.find(roles, {role: 'Landlord'})
    else
      return _.find(roles, {role: 'Seller'})
}

const getRealtor = ({deal, roles}) => {
  if (deal.deal_type === Deal.BUYING)
    return _.find(roles, {role: 'BuyerBroker'})
  else
    return _.find(roles, {role: 'SellerBroker'})
}

const getToAddress = ({deal, client}) => {
    if (deal.deal_type === Deal.BUYING) {
      return {
        moving_to_street_address: Deal.getContext(deal, 'street_address'),
        moving_to_city: Deal.getContext(deal, 'city'),
        moving_to_state: Deal.getContext(deal, 'state_cide'),
        moving_to_zipcode: Deal.getContext(deal, 'postal_code'),
      }
    } else {
      const { future_address } = client

      return {
        moving_to_street_address: future_address?.line1,
        moving_to_city: future_address?.city,
        moving_to_state: future_address?.state_code,
        moving_to_zipcode: future_address?.postcode
      }
    }
}

const getFromAddress = ({deal, client}) => {
    if (deal.deal_type === Deal.BUYING) {
      const { current_address } = client

      return {
        moving_from_street_address: current_address?.line1,
        moving_from_city: current_address?.city,
        moving_from_state: current_address?.state_code,
        moving_from_zipcode: current_address?.postcode
      }
    } else {
      return {
        moving_from_street_address: Deal.getContext(deal, 'street_address'),
        moving_from_city: Deal.getContext(deal, 'city'),
        moving_from_state: Deal.getContext(deal, 'state_code'),
        moving_from_zipcode: Deal.getContext(deal, 'postal_code'),
      }
    }
}

const sync = async deal => {
  Context.log('Syncing MoveEasy for', deal.id)

  const credentials = await getCredentials(deal.brand)

  if (!credentials)
    return

  const status = await getStatus(deal)

  const roles = await DealRole.getAll(deal.roles)
  const property_type = await BrandPropertyType.get(deal.property_type)

  const agent = getAgent({deal, roles, property_type})
  const client = getClient({deal, roles, property_type})
  const realtor = getRealtor({deal, roles, property_type})

  const body = {
    status,

    client_first_name: client.legal_first_name,
    client_last_name: client.legal_last_name,
    client_email: client.email,
    client_phone: client.phone_number,

    ...getFromAddress({deal, client}),
    ...getToAddress({deal, client}),

    agent_first_name: agent.legal_first_name,
    agent_last_name: agent.legal_last_name,
    agent_email: 'katie+dedemo@moveeasy.com' ?? agent.email,

    listing_date: moment(Deal.getContext(deal, 'list_date')).format('YYYY-MM-DD'),
    estimated_closing_date: moment(Deal.getContext(deal, 'closing_date')).format('YYYY-MM-DD'),

    buyer_seller: deal.deal_type === Deal.BUYING ? 'Buyer' : 'Seller',

    tc_email:deal.email,

    brokerage_name: agent.company_title,
    realtor_name: realtor?.legal_display_name

  }

  console.log(body)

  const res = await request({
    uri: credentials.url,
    qs: {
      format: 'json'
    },
    auth: credentials,
    json: true,
    method: 'post',
    body
  })

  Context.log('Saved', res)

  await save({deal})
}

const queue = peanar.job({
  handler: sync,
  queue: 'move_easy',
  exchange: 'move_easy',
  error_exchange: 'move_easy.error',
  retry_exchange: 'move_easy.retry',
  max_retries: 10,
  name: 'sync_move_easy',
  retry_delay: 600000
})

const getCredentials = async (brand) => {
  const { rows } = await db.query.promise('deal/move_easy/get-credentials', [brand])
  return rows[0]
}

const considerSync = async (deal, brand_ids) => {
  Context.log('Considering MoveEasy sync for', deal.id)

  const statuses = await BrandStatus.getByBrand(deal.brand)

  const status = await getStatus(deals)
  if (!status)
    return

  const credentials = await getCredentials(deal.brand)

  if (!credentials)
    return

  Context.log('Queueing MoveEasy sync for', deal.id)
  await queue(deal)
}

module.exports = {
  considerSync,
  sync
}
