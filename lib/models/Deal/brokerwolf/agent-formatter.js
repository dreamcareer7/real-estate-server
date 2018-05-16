const codes = {
  CoSellerAgent: 'L',
  SellerAgent: 'L',
  BuyerAgent: 'S',
  CoBuyerAgent: 'S'
}

const end_counts = {
  CoSellerAgent: 0,
  SellerAgent: 1,
  BuyerAgent: 1,
  CoBuyerAgent: 0
}

const calculateCommission = ({deal, role}) => {
  if (role.commission_dollar !== null)
    return role.commission_dollar

  if (role.commission_percentage === null)
    return false

  const sales_price = Deal.BrokerWolf.getSellPrice(deal)

  return sales_price * (role.commission_percentage / 100)
}


const agentFormatter = ({deal, role, personnel}) => {
  const EndCode = codes[role.role]
  if (!EndCode)
    throw new Error.Generic(`Unknown agent role ${role.role}`)

  const commission = calculateCommission({deal, role})

  const EndCount = end_counts[role.role]

  const a = {
    rechat_id: role.id, // We need this a bit further
    Id: role.brokerwolf_id,
    EndCode,
    Commission: commission || 0,
    EndCount,
    //RowVersion: role.brokerwolf_row_version
  }

  const end_type = Deal.getContext(deal, 'ender_type', deal.deal_type)

  let our_side = false

  if (deal.deal_type === 'Selling')
    if (role.role === 'SellerAgent' || role.role === 'CoSellerAgent')
      our_side = true

  if (deal.deal_type === 'Buying')
    if (role.role === 'BuyerAgent' || role.role === 'CoBuyerAgent')
      our_side = true

  if (end_type === Deal.AGENT_DOUBLE_ENDER)
    our_side = true

  if (end_type === Deal.OFFICE_DOUBLE_ENDER)
    our_side = true

  if (our_side) {
    if (!role.agent_brokerwolf_id) {
      let error = `Cannot find BrokerWolf id for ${role.legal_full_name} (${role.email})`

      error += `\t\t(Deal: ${deal.id})\t(Role: ${role.id})`

      if (role.user) {
        error += `\t\t(User: ${role.user.email})`

        if (role.user.agent)
           error += `\t\t(Agent: ${role.user.agent.mlsid})`
      }
      throw new Error.Generic(error)
    }
    /*
     * Commission is required only for our side's agents.
     * We set it to 0 for other side's agents as BW consider's it a required field
     * Even for other side's agents.
     */

    if (commission === false)
      throw new Error.Generic(`Role ${role.id} has no commission set`)

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

  if (role.email)
    a.EmailAddresses = [
      {
        Address: role.email,
        Primary: true,
        TypeCode: 'W'
      }
    ]

  if (role.phone_number)
    a.PhoneNumbers = [
      {
        Number: role.phone_number,
        Primary: true,
        TypeCode: 'B'
      }
    ]

  personnel.ExternalAgentCommissions.push(a)
}

module.exports = agentFormatter