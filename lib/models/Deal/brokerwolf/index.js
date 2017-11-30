const request = require('request-promise-native')
const promisify = require('../../../utils/promisify')
const context = require('../context')

const af = require('./agent-formatter.js')
const cf = require('./client-formatter.js')
// const bf = require('./business-formatter.js')

const formatters = {
  BuyerAgent: af,
  CoBuyerAgent: af,
  SellerAgent: af,
  CoSellerAgent: af,
  //   Title: bf,
  //   Lawyer: bf,
  //   TeamLead: bf,
  //   Appraiser: bf,
  //   Inspector: bf,
  Seller: cf,
  Buyer: cf,
  Lender: cf,
  Tenant: cf,
  Landlord: cf
}

Deal.BrokerWolf = {}

const sensitive = Object.keys(context).filter(key => Boolean(context[key].brokerwolf))

Deal.BrokerWolf.considerSync = async old => {
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

  const ourEnds = new Set
  const EndCount = ourEnds.size

  const sales_price = Deal.getContext(deal, 'sales_price')

  if (!sales_price)
    return

  const comm_listing_p = Deal.getContext(deal, 'commission_listing', 0)
  const comm_selling_p = Deal.getContext(deal, 'commission_selling', 0)

  const SellingCommission = sales_price * comm_selling_p
  const BuyingCommission = sales_price * comm_listing_p

  const TotalCommission = SellingCommission + BuyingCommission

  const PropertyTypeId = await BrokerWolf.PropertyTypes.getId(deal.property_type)

  const end_type = Deal.getContext(deal, 'ender_type', deal.deal_type)
  const ClassificationId = await BrokerWolf.Classifications.getId(end_type)

  const transaction = {
    Id: deal.brokerwolf_id,
    MlsNumber: Deal.getContext(deal, 'mls_number'),
//     RowVersion: deal.brokerwolf_row_version,
    EndCount,
    PropertyTypeId,
    ClassificationId,
    CloseDate: Deal.getContext(deal, 'closing_date'),
    OfferDate: Deal.getContext(deal, 'contract_date'),
    SellPrice: sales_price,
    Tiers: [
      {
        Id: deal.brokerwolf_tier_id,
        ClassificationId,
        SellPrice: sales_price,
        CloseDate: Deal.getContext(deal, 'closing_date'),
        SellingCommission,
        BuyingCommission,
        TotalCommission,
        AgentCommissions: personnel.AgentCommissions,
        ExternalAgentCommissions: personnel.ExternalAgentCommissions
      }
    ],
    ClientContacts: personnel.ClientContacts,
    MLSAddress: {
      StreetNumber: Deal.getContext(deal, 'street_number'),
      StreetName: Deal.getContext(deal, 'street_name'),
      StreetDirection: Deal.getContext(deal, 'street_dir_prefix'),
      Unit: Deal.getContext(deal, 'unit_number'),
      City: Deal.getContext(deal, 'city'),
      ProvinceCode: Deal.getContext(deal, 'state_code'),
      PostalCode: Deal.getContext(deal, 'postal_code'),
      CountryCode: Deal.getContext(deal, 'country'),
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
      commission: role.Commission,
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
