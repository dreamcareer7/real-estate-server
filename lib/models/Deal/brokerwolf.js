const promisify = require('../../utils/promisify')
const context = require('./context')

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
  console.log('Should Sync BrokerWolf')

  const AgentCommissions = []

  const roles = await promisify(DealRole.getAll)(deal.roles)

  roles.forEach(role => {
    if (!role.commission)
      return

    const codes = {
      CoSellerAgent: 'S',
      SellerAgent: 'S',
      BuyerAgent: 'L',
      CoBuyerAgent: 'L'
    }

    const EndCode = codes[role.role]
    if (!EndCode)
      return

    if (!role.agent_brokerwolf_id)
      return

    const a = {
      Id: role.brokerwolf_id,
      EndCode,
      Commission: role.commission,
      AgentId: role.brokerwolf_id
    }

    AgentCommissions.push(a)
  })

  const sales_price = Deal.getContext(deal, 'sales_price')

  if (!sales_price)
    return

  const comm_listing_p = Deal.getContext(deal, 'commission_listing')
  const comm_selling_p = Deal.getContext(deal, 'commission_selling')

  const SellingCommission = sales_price * comm_selling_p
  const BuyingCommission = sales_price * comm_listing_p

  const TotalCommission = SellingCommission + BuyingCommission

  const PropertyTypeId = await BrokerWolf.PropertyTypes.getId(deal.property_type)

//   const transaction = {
//     Id: deal.brokerwolf_transaction_id,
//     MlsNumber: Deal.getContext(deal, 'mls_number'),
//     EndCount: 1,
//     PropertyTypeId:,
//     ClassificationId:,
//     CloseDate: Deal.getContext(deal, 'closing_date'),
//     OfferDate:Deal.getContext(deal, 'contract_date'),
//     SellPrice: sales_price,
//     Tiers: [
//       {
//         Id:, deal.brokerwolf_tier_id,
//         ClassificationId:,
//         SellPrice: sales_price,
//         CloseDate: Deal.getContext(deal, 'closing_date'),
//         SellingCommission,
//         BuyingCommission,
//         TotalCommission,
//         AgentCommissions,
//         ExternalAgentCommissions,
//       }
//     ],
//     MLSAddress: {
//       StreetNumber: Deal.getContext(deal, 'street_number'),
//       StreetName: Deal.getContext(deal, 'street_name'),
//       StreetDirection: Deal.getContext(deal, 'street_dir_prefix'),
//       Unit: Deal.getContext(deal, 'unit_number'),
//       City: Deal.getContext(deal, 'city'),
//       ProvinceCode: Deal.getContext(deal, 'state_code'),
//       PostalCode: Deal.getContext(deal, 'postal_code'),
//       CountryCode: Deal.getContext(deal, 'country'),
//     }
//   }
}