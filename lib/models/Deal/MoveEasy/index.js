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

const DealChecklist = require('../checklist/get')
const BrandChecklist = require('../../Brand/deal/checklist/constants')

const BrandStatus = require('../../Brand/deal/status/get')

const getState = async deal => {
  const { rows } = await db.executeSql.promise('SELECT * FROM move_easy_deals WHERE deal = $1', [deal])
  const [ row ] = rows
  return row
}

const setState = async (deal_id, contract_id, object, move_easy_id) => {
  const { rows } = await db.executeSql.promise('INSERT INTO move_easy_deals (deal, contract, last_synced, move_easy_id) VALUES ($1, $2, $3, $4) ON CONFLiCT(deal) DO UPDATE SET contract = EXCLUDED.contract, last_synced = EXCLUDED.last_synced, move_easy_id = EXCLUDED.move_easy_id', [deal_id, contract_id, object, move_easy_id])
  const [ row ] = rows
  return row
}

const getUpdateFunctions = async deal => {
  const fns = []

  const state = await getState(deal.id)
  if (!state) {
    fns.push(initial)
    return fns
  }

  const estimated_closing_date = getClosing(deal)
  if (estimated_closing_date !== state.last_synced.estimated_closing_date)
    fns.push(updateClosing.bind(null, state))

  const status = await getStatus(deal)
  if (status !== state.last_synced.status)
    fns.push(updateStatus.bind(null, state))

  return fns
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

const getContractChecklist = async deal => {
  const checklists = await DealChecklist.getAll(deal.checklists)

  return checklists.find(checklist => {
    if (checklist.deactivated_at)
      return false

    if (checklist.terminated_at)
      return false

    if (checklist.checklist_type === BrandChecklist.SELLING)
      return

    return true
  })
}

const getAgent = ({deal, roles}) => {
  if (deal.deal_type === Deal.BUYING)
    return _.find(roles, {role: 'BuyerAgent'})
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
  return _.find(roles, {role: 'Seller'})
}

const getRealtor = ({deal, roles}) => {
  if (deal.deal_type === Deal.BUYING)
    return _.find(roles, {role: 'BuyerBroker'})
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
  } 
  const { future_address } = client

  return {
    moving_to_street_address: future_address?.line1,
    moving_to_city: future_address?.city,
    moving_to_state: future_address?.state_code,
    moving_to_zipcode: future_address?.postcode
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
  } 
  return {
    moving_from_street_address: Deal.getContext(deal, 'street_address'),
    moving_from_city: Deal.getContext(deal, 'city'),
    moving_from_state: Deal.getContext(deal, 'state_code'),
    moving_from_zipcode: Deal.getContext(deal, 'postal_code'),
  }
    
}

const getClosing = deal => {
  const closing = Deal.getContext(deal, 'closing_date') ?? Deal.getContext(deal, 'lease_executed')
  return moment(closing).format('YYYY-MM-DD')
}

const getListingDate = deal => {
  const date = Deal.getContext(deal, 'list_date')
  if (!date)
    return undefined

  return moment(date).format('YYYY-MM-DD')
}

const initial = async (credentials, deal) => {
  const status = await getStatus(deal)

  const contract = await getContractChecklist(deal)

  const roles = await DealRole.getAll(deal.roles)
  const property_type = await BrandPropertyType.get(deal.property_type)

  const agent = getAgent({deal, roles, property_type})
  const client = getClient({deal, roles, property_type})
  const realtor = getRealtor({deal, roles, property_type})

  const estimated_closing_date = getClosing(deal)
  const listing_date = getListingDate(deal)

  if (!client || !client.email)
    return // Client fields are required in MoveEasy API

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
    agent_email: agent.email,

    listing_date,
    estimated_closing_date,

    buyer_seller: deal.deal_type === Deal.BUYING ? 'Buyer' : 'Seller',

    brokerage_name: agent.company_title,
    realtor_name: realtor?.legal_display_name

  }

  try {
    const { unique_id } = await request({
      uri: credentials.url,
      qs: {
        format: 'json'
      },
      auth: credentials,
      json: true,
      method: 'post',
      body
    })

    Context.log('Intitial sync', body)

    await setState(deal.id, contract.id, body, unique_id)
  } catch(e) {
    /*
     * MoveEasy can only accept 1 client. So 2 deals with the same client causes an "Email already exists" error.
     * There is also a lot of other validation issues which we can't do much about.
     * Gracefully capturing the error means we won't retry this.
     */
    if (e.statusCode === 400)
      return

    throw e
  }
}

const updateClosing = async (state, credentials, deal) => {
  const closing_date = await getClosing(deal)

  await request.patch({
    uri: `${credentials.url}${state.move_easy_id}/update-closing-date/`,
    qs: {
      format: 'json'
    },
    auth: credentials,
    json: true,
    method: 'post',
    body: {
      closing_date
    }
  })

  state.last_synced.estimated_closing_date = closing_date

  await setState(deal.id, state.contract, state.last_synced, state.move_easy_id)
  Context.log('updated closing to', closing_date)
}

const updateStatus = async (state, credentials, deal) => {
  const status = await getStatus(deal)

  await request.patch({
    uri: `${credentials.url}${state.move_easy_id}/update-status/`,
    qs: {
      format: 'json'
    },
    auth: credentials,
    json: true,
    method: 'post',
    body: {
      status
    }
  })

  state.last_synced.status = status

  await setState(deal.id, state.contract, state.last_synced, state.move_easy_id)
  Context.log('updated status to', status)
}

const sync = async deal => {
  Context.log('Syncing MoveEasy for', deal.id)

  const credentials = await getCredentials(deal.brand)

  if (!credentials)
    return

  const status = await getStatus(deal)
  if (!status)
    return

  const fns = await getUpdateFunctions(deal)
  for(const fn of fns)
    await fn(credentials, deal)
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

  const credentials = await getCredentials(deal.brand)

  if (!credentials)
    return

  const contract = await getContractChecklist(deal)
  if (!contract)
    return

  const status = await getStatus(deal)
  if (!status)
    return

  if (getUpdateFunctions.length < 1)
    return

  Context.log('Queueing MoveEasy sync for', deal.id)
  await queue(deal)
}

module.exports = {
  considerSync,
  sync
}
