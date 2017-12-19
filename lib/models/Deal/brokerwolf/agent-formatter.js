const codes = {
  CoSellerAgent: 'S',
  SellerAgent: 'S',
  BuyerAgent: 'L',
  CoBuyerAgent: 'L'
}

const end_counts = {
  CoSellerAgent: 0,
  SellerAgent: 1,
  BuyerAgent: 1,
  CoBuyerAgent: 0
}

const calculateCommission = ({deal, role}) => {
  if (role.commission_dollar)
    return role.commission_dollar

  if (!role.commission_percentage)
    return undefined

  const sales_price = Deal.getContext('sales_price')

  if (!sales_price)
    return undefined

  return sales_price * (role.commission_percentage / 100)
}


const agentFormatter = ({deal, role, personnel}) => {
  const EndCode = codes[role.role]
  if (!EndCode)
    throw new Error.Generic(`Unknown agent role ${role.role}`)

  const commission = calculateCommission({deal, role})

  if (!commission)
    throw new Error.Generic(`Role ${role.id} has no commission set`)

  const EndCount = end_counts[role.role]

  const a = {
    rechat_id: role.id, // We need this a bit further
    Id: role.brokerwolf_id,
    EndCode,
    Commission: commission,
    EndCount,
    //RowVersion: role.brokerwolf_row_version
  }

  const end_type = Deal.getContext(deal, 'ender_type', deal.deal_type)

  let our_side = false

  if (deal.deal_type === 'Selling')
    if (role.role === 'SelllerAgent' || role.role === 'CoSellerAgent')
      our_side = true

  if (deal.deal_type === 'Buying')
    if (role.role === 'BuyerAgent' || role.role === 'CoBuyerAgent')
      our_side = true

  if (end_type === Deal.AGENT_DOUBLE_ENDER)
    our_side = true

  if (end_type === Deal.OFFICE_DOUBLE_ENDER)
    our_side = true

  if (our_side) {
    if (!role.agent_brokerwolf_id)
      throw new Error.Generic(`Cannot find BrokerWolf id for agent ${role.id}`)

    a.AgentId = role.agent_brokerwolf_id

    personnel.AgentCommissions.push(a)

    return
  }

  delete a.EndCount

  a.ExternalAgent = {
    FirstName: role.legal_first_name,
    LastName: role.legal_last_name,
    EndCode,
    ContactTypeId: role.brokerwolf_contact_type,
    CompanyName: role.company_title
  }

  if (role.user.email)
    a.EmailAddresses = [
      {
        Address: role.user.email,
        Primary: true,
        TypeCode: 'W'
      }
    ]

  if (role.user.phone_number)
    a.PhoneNumbers = [
      {
        Number: role.user.phone_number,
        Primary: true,
        TypeCode: 'B'
      }
    ]

  personnel.ExternalAgentCommissions.push(a)
}

module.exports = agentFormatter