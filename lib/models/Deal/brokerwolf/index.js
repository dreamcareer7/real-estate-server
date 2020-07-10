const moment = require('moment')
const request = require('request-promise-native')
const promisify = require('../../../utils/promisify')
const { peanar } = require('../../../utils/peanar')
const _ = require('lodash')
const db = require('../../../utils/db')
const Context = require('../../Context')
const Brand = require('../../Brand')
const DealRole = require('../role')
const BrokerWolf = require('../../BrokerWolf')
const Orm = require('../../Orm')

const {
  get
} = require('../get')

const {
  getContext
} = require('../context/get')

const {
  RESIDENTIAL_LEASE,
  COMMERCIAL_LEASE
} = require('../constants')

const af = require('./agent-formatter.js')
const cf = require('./client-formatter.js')
const bf = require('./business-formatter.js')

const log = (deal, message) => {
  Context.log(`BrokerWolf sync on ${deal.id} ${message}`)
}

const error = (deal, reason) => {
  log(deal, `refused: ${reason}`)
}


const formatters = {
  BuyerAgent: af,
  CoBuyerAgent: af,
  SellerAgent: af,
  CoSellerAgent: af,
  Seller: cf,
  Buyer: cf,
  Lender: cf,
  Tenant: cf,
  Landlord: cf,
  SellerLawyer: bf,
  BuyerLawyer: bf,
  BuyerPowerOfAttorney: bf,
  SellerPowerOfAttorney: bf,
  LandlordPowerOfAttorney: bf,
  TenantPowerOfAttorney: bf,
  SellerReferral: bf,
  BuyerReferral: bf,
  Title: bf
}

const considerSync = async old => {
  const settings = await BrokerWolf.Settings.getByBrand(old.brand)

  if (!settings)
    return error(old, 'Brokerwolf integration is not enabled for this brand')

  const updated = await promisify(get)(old.id)

  const isTraining = await Brand.isTraining(updated.brand)

  if (isTraining)
    return error(updated, 'Deal is in training mode')

  if (!updated.faired_at)
    return error(updated, 'Deal is draft')

  await queue(updated.id)
}

const sync_brokerwolf = async (id) => {
  const deal = await promisify(get)(id)
  await sync(deal)
}

const queue = peanar.job({
  handler: sync_brokerwolf,
  queue: 'brokerwolf',
  exchange: 'brokerwolf',
  error_exchange: 'brokerwolf.error',
  retry_exchange: 'brokerwolf.retry',
  max_retries: 10,
  name: 'sync_brokerwolf',
  retry_delay: 30000
})

const getSellPrice = deal => {
  let SellPrice

  if (deal.property_type === RESIDENTIAL_LEASE || deal.property_type === COMMERCIAL_LEASE)
    SellPrice = getContext(deal, 'leased_price')
  else
    SellPrice = getContext(deal, 'sales_price')

  return SellPrice
}

const getClosingDate = deal => {
  let ClosingDate

  if (deal.property_type === RESIDENTIAL_LEASE || deal.property_type === COMMERCIAL_LEASE)
    ClosingDate = getContext(deal, 'lease_executed')
  else
    ClosingDate = getContext(deal, 'closing_date')

  return ClosingDate
}

const getContractDate = deal => {
  let ContractDate

  if (deal.property_type === RESIDENTIAL_LEASE || deal.property_type === COMMERCIAL_LEASE)
    ContractDate = getContext(deal, 'lease_executed', new Date)
  else
    ContractDate = getContext(deal, 'contract_date', new Date)

  return ContractDate
}

const sync = async deal => {
  const isTraining = await Brand.isTraining(deal.brand)

  if (isTraining)
    return error(deal, 'Deal is in training mode')

  const SellPrice = getSellPrice(deal)

  if (!SellPrice)
    return error(deal, 'SellPrice is not defined')

  const personnel = {
    AgentCommissions: [],
    ExternalAgentCommissions: [],
    ClientContacts: [],
    BusinessContacts: []
  }

  const _roles = await DealRole.getAll(deal.roles)
  const roles = await Orm.populate({
    models: _roles
  })

  roles.forEach(role => {
    const formatter = formatters[role.role]

    if (!formatter)
      throw Error.Generic(`Cannot find BW role formatter for role ${role.id}`)

    formatter({
      deal,
      personnel,
      role
    })
  })

  const PropertyTypeId = await BrokerWolf.PropertyTypes.getId(deal.property_type)

  const end_type = getContext(deal, 'ender_type') || deal.deal_type

  const ClassificationId = await BrokerWolf.Classifications.getId(end_type)

  const closing_date = getClosingDate(deal)

  if (!closing_date)
    return error(deal, 'CloseDate is not defined')

  const contract_date = getContractDate(deal)

  /* We should send either mls number of file id, by request of BF
   * Based on #929
   */
  let MlsNumber = getContext(deal, 'mls_number')

  if (!MlsNumber)
    MlsNumber = getContext(deal, 'file_id')

  const ProvinceCode = getContext(deal, 'state_code') || getContext(deal, 'state')

  /*
   * Street Number cannot be more than 12 characters in BW
   */
  let StreetNumber = getContext(deal, 'street_number') || '0'
  if (StreetNumber.length > 12)
    StreetNumber = StreetNumber.substr(0, 11) + '…'

  log(deal, 'Attempting')

  const transaction = {
    Id: deal.brokerwolf_id,
    MlsNumber,
    // RowVersion: deal.brokerwolf_row_version,
    PropertyTypeId,
    ClassificationId,
    CloseDate: moment(closing_date).format('YYYY-MM-DD'),
    OfferDate: moment(contract_date).format('YYYY-MM-DD'),
    SellPrice,
    Tiers: [
      {
        Id: deal.brokerwolf_tier_id,
        ClassificationId,
        SellPrice,
        CloseDate: moment(closing_date).format('YYYY-MM-DD'),
        AgentCommissions: personnel.AgentCommissions,
        ExternalAgentCommissions: personnel.ExternalAgentCommissions
      }
    ],
    BusinessContacts: personnel.BusinessContacts,
    ClientContacts: personnel.ClientContacts,
    MLSAddress: {
      StreetNumber,
      StreetName: getContext(deal, 'street_name'),
      StreetDirection: getContext(deal, 'street_dir_prefix'),
      Unit: getContext(deal, 'unit_number'),
      City: getContext(deal, 'city'),
      ProvinceCode,
      PostalCode: getContext(deal, 'postal_code'),
      CountryCode: getContext(deal, 'country', 'US'),
    }
  }

  let uri = '/wolfconnect/transactions/v1/'
  let method = 'POST'

  if (deal.brokerwolf_id) {
    method = 'PUT'
    uri += deal.brokerwolf_id
  }

  const options = {
    method,
    uri,
    body: transaction,
    json: true,
    brand: deal.brand
  }

  const req = await BrokerWolf.tokenize(options)
  let saved

  try {
    saved = await request(req)
  } catch (e) {
    /*
     * When we update a Brokerwolf deal, we'll try to update existing roles on it
     * But sometimes we'll get an error like this:
     * {"Code":404,"Message":"Not Found","Details":"Agent Commission with id \"m-DacxWeQTXJh4VrLXNn6Q==\" does not exist."}
     * The id refers to the deals_roles.brokerwolf_id.
     *
     * What happens is this: Brokerwolf assigns an ID to each "Contact" (Agents, etc). Which we'll store as deals_roles.brokerwolf_id
     * And every time a deal is updated, all contacts will get new ID's.
     *
     * So, when a deal is updated directly in Brokerwolf, those contacts will get new ID's without Rechat ever being updated.
     * That means once this happens, Rechat's deals_roles.brokerwolf_id are outdated.
     *
     * So when Rechat tries to update the deal later, Brokerwolf errors us, telling us the roles we wanna update don't exist.
     *
     * This is not something we can recover from. Once a deal is updated in BW, it's connection in Rechat is broken.
     *
     * This is a Brokerwolf issue we discussed with them: It's not possible to implement 2-way-sync with BW as of now.
     * Therefore all we have to do is to consider it done and don't count it as an error.
     */

    if (e?.response?.body?.Code === 404) {
      error(deal, 'Deal already updated in Brokerwolf')
      return
    }

    /*
     * When a transaction is "closed" in BrokerWolf (Code 1008) it cannot be updated anymore.
     */

    if (e?.response?.body?.Code === 1008) {
      error(deal, 'Deal already closed in Brokerwolf')
      return
    }

    /*
     * When a transaction already exists in Brokerwolf, it doesn't allow a sync
     *  {"Code":1006,"Message":"Validation failed.","Details":"Transaction 4338 Southcrest failed validation.\r\n - Transaction already exists."}
     */

    if (e?.response?.body?.Code === 1006) {
      error(deal, 'Deal already exists in Brokerwolf')
      return
    }

    throw e
  }

  log(deal, 'Done')

  await setMetadata({
    deal,
    transaction: saved
  })

  const updateRole = async ({role, Role}) => {
    await DealRole.update({
      id: role.rechat_id,
      brokerwolf_id: Role.Id,
      brokerwolf_row_version: Role.RowVersion
    })
  }

  const updateRoles = async type => {
    const Saved = saved.Tiers[0][type]
    if (!Saved)
      return

    for (const i in Saved) {
      const Role = Saved[i]

      let role

      role = _.find(personnel[type], {
        Id: Role.Id
      })

      /*
       * If we're updating a role, we know about it's ID.
       * We can find it in response array.
       *
       * But if it's a new role, then we do not know
       * it's Id yet.
       *
       * In that case the find call above is not gonna
       * find it.
       *
       * We'll try to find it based on the array index.
       *
       * Hoping that BW returns items on the same order that
       * they were inserted in.
       */
      if (!role) {
        role = personnel[type][i]
      }

      await updateRole({role, Role})
    }
  }

  await updateRoles('AgentCommissions')
  await updateRoles('ExternalAgentCommissions')
  await updateRoles('ClientContacts')
  await updateRoles('BusinessContacts')
}

const setMetadata = async ({deal, transaction}) => {
  await db.query.promise('deal/brokerwolf/set', [
    deal.id,
    transaction.Id,
    transaction.Tiers[0].Id,
    transaction.RowVersion
  ])
}

module.exports = {
  sync,
  getSellPrice,
  considerSync
}
