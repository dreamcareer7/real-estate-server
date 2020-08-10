const {
  getContext
} = require('../context/get')

const {
  AGENT_DOUBLE_ENDER,
  OFFICE_DOUBLE_ENDER
} = require('../constants')

const set = ({deal, roles}) => {
  PrimaryAgent({deal, roles})
  ExternalBuyerAgent({deal, roles})
  InternalBuyerAgent({deal, roles})
  InternalSeller({deal, roles})
  InternalBuyer({deal, roles})
}

const PrimaryAgent = ({deal, roles}) => {
  let role

  if (deal.deal_type === 'Buying')
    role = 'BuyerAgent'

  if (deal.deal_type === 'Selling')
    role = 'SellerAgent'

  roles
    .filter(r => r.role === role)
    .map(r => {
      return {
        ...r,
        role: 'PrimaryAgent'
      }
    })
    .forEach(role => {
      roles.push(role)
    })
}

const ExternalBuyerAgent = ({deal, roles}) => {
  const ender_type = getContext(deal, 'ender_type')

  /*
   * No external agent on double ender deals
   */

  if (ender_type === AGENT_DOUBLE_ENDER)
    return

  if (ender_type === OFFICE_DOUBLE_ENDER)
    return

  roles
    .filter(r => r.role === 'BuyerAgent')
    .forEach(role => {
      roles.push({
        ...role,
        role: 'ExternalBuyerAgent'
      })
    })
}

const InternalBuyerAgent = ({deal, roles}) => {
  const ender_type = getContext(deal, 'ender_type')

  if (ender_type !== AGENT_DOUBLE_ENDER && ender_type !== OFFICE_DOUBLE_ENDER)
    return

  roles
    .filter(r => r.role === 'BuyerAgent')
    .forEach(role => {
      roles.push({
        ...role,
        role: 'InternalBuyerAgent'
      })
    })
}

const InternalBuyer = ({deal, roles}) => {
  roles
    .filter(r => r.role === 'Buyer' && deal.deal_type === 'Buying')
    .forEach(role => {
      roles.push({
        ...role,
        role: 'InternalBuyer'
      })
    })
}

const InternalSeller = ({deal, roles}) => {
  roles
    .filter(r => r.role === 'Seller' && deal.deal_type === 'Selling')
    .forEach(role => {
      roles.push({
        ...role,
        role: 'InternalSeller'
      })
    })
}

module.exports = set
