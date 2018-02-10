const moment = require('moment')
const request = require('request-promise-native')
const promisify = require('../../../utils/promisify')

const af = require('./agent-formatter.js')
const cf = require('./client-formatter.js')
const bf = require('./business-formatter.js')

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
  SellerReferral: bf,
  BuyerReferral: bf
}

Deal.BrokerWolf = {}


Deal.BrokerWolf.considerSync = async old => {
  const sensitive = Object.keys(Deal.contexts).filter(key => Boolean(Deal.contexts[key].brokerwolf))

  const updated = await promisify(Deal.get)(old.id)

  let shouldUpdate = false

  for(const attr of sensitive) {
    const oldValue = Deal.getContext(old, attr)
    const newValue = Deal.getContext(updated, attr)

    if (oldValue !== newValue)
      shouldUpdate = true
  }

  if (!shouldUpdate)
    return

  await Deal.BrokerWolf.sync(updated)
}

Deal.BrokerWolf.sync = async deal => {
  const personnel = {
    AgentCommissions: [],
    ExternalAgentCommissions: [],
    ClientContacts: [],
    BusinessContacts: []
  }

  const _roles = await promisify(DealRole.getAll)(deal.roles)
  const roles = await Orm.populate({
    models: _roles
  })

  try {
    roles.forEach(role => {
      const formatter = formatters[role.role]

      if (!formatter)
        throw new Error.Generic(`Cannot find BW role formatter for role ${role.id}`)

      formatter({
        deal,
        personnel,
        role
      })
    })
  } catch (e) {
    console.log(`Not syncing ${deal.id} with brokerwolf due to`, e)
    return
  }

  const sales_price = Deal.getContext(deal, 'sales_price')

  if (!sales_price)
    return

  const PropertyTypeId = await BrokerWolf.PropertyTypes.getId(deal.property_type)

  const end_type = Deal.getContext(deal, 'ender_type', deal.deal_type)
  const ClassificationId = await BrokerWolf.Classifications.getId(end_type)

  const closing_date = Deal.getContext(deal, 'closing_date')

  if (!closing_date)
    return

  const contract_date = Deal.getContext(deal, 'contract_date', new Date)

  /* We should send either mls number of file id, by request of BF
   * Based on #929
   */
  let MlsNumber = Deal.getContext(deal, 'mls_number')

  if (!MlsNumber)
    MlsNumber = Deal.getContext(deal, 'file_id')

  const transaction = {
    Id: deal.brokerwolf_id,
    MlsNumber,
    // RowVersion: deal.brokerwolf_row_version,
    PropertyTypeId,
    ClassificationId,
    CloseDate: moment(closing_date).format('YYYY-MM-DD'),
    OfferDate: moment(contract_date).format('YYYY-MM-DD'),
    SellPrice: sales_price,
    Tiers: [
      {
        Id: deal.brokerwolf_tier_id,
        ClassificationId,
        SellPrice: sales_price,
        CloseDate: moment(closing_date).format('YYYY-MM-DD'),
        AgentCommissions: personnel.AgentCommissions,
        ExternalAgentCommissions: personnel.ExternalAgentCommissions
      }
    ],
    BusinessContacts: personnel.BusinessContacts,
    ClientContacts: personnel.ClientContacts,
    MLSAddress: {
      StreetNumber: Deal.getContext(deal, 'street_number'),
      StreetName: Deal.getContext(deal, 'street_name'),
      StreetDirection: Deal.getContext(deal, 'street_dir_prefix'),
      Unit: Deal.getContext(deal, 'unit_number'),
      City: Deal.getContext(deal, 'city'),
      ProvinceCode: Deal.getContext(deal, 'state_code'),
      PostalCode: Deal.getContext(deal, 'postal_code'),
      CountryCode: Deal.getContext(deal, 'country', 'US'),
    }
  }

  let uri = '/wolfconnect/transactions/v1/'
  let method = 'POST'

  if (deal.brokerwolf_id) {
    method = 'PUT'
    uri += deal.brokerwolf_id
  }

  console.log(JSON.stringify(transaction))

  const options = {
    method,
    uri,
    body: transaction,
    json: true
  }

  const req = BrokerWolf.tokenize(options)

  const saved = await request(req)

  deal.brokerwolf_id = saved.Id
  deal.brokerwolf_tier_id = saved.Tiers[0].Id
  deal.brokerwolf_row_version = saved.RowVersion

  await promisify(Deal.update)(deal)

  const updateRole = async ({role, Role}) => {
    await Deal.updateRole({
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
      const role = personnel[type][i]
      const Role = Saved[i]

      await updateRole({role, Role})
    }
  }

  await updateRoles('AgentCommissions')
  await updateRoles('ExternalAgentCommissions')
  await updateRoles('ClientContacts')
  await updateRoles('BusinessContacts')
}
