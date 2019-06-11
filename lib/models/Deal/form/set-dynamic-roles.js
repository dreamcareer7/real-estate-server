const set = ({deal, roles}) => {
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

module.exports = set
