const moment = require('moment')

const { getDealById } = require('./deal')

function getPrimaryAgent(deal) {
  const primaryAgentRole =
    deal.deal_type === 'Buying' ? 'BuyerAgent' : 'SellerAgent'

  return deal.roles.find(r => r.role === primaryAgentRole)
}

const ENDER_TYPES = [
  {
    text: 'Normal',
    value: 'Normal'
  },
  {
    text: 'Office Double Ender',
    value: 'OfficeDoubleEnder'
  },
  {
    text: 'Agent Double Ender',
    value: 'AgentDoubleEnder'
  }
]

function getEnderType(deal) {
  let ender_type
  if (deal.deal_context.ender_type) {
    ender_type = deal.deal_context.ender_type.text
  } else {
    ender_type = 'Normal'
  }

  return ENDER_TYPES.find(et => et.value === ender_type) || ENDER_TYPES[0]
}

function getChangeEnderTypePart(deal) {
  return {
    text: 'Change ender type',
    attachment_type: 'default',
    callback_id: 'Deal:' + deal.id,
    actions: [
      {
        name: 'change_deal_ender_type',
        text: 'Choose ender type...',
        type: 'select',
        options: ENDER_TYPES,
        selected_options: [getEnderType(deal)]
      }
    ]
  }
}

function getUndeleteDealPart(deal) {
  return {
    fallback: 'Do you want to undelete this deal?',
    title: 'Do you want to undelete this deal?',
    callback_id: 'Deal:' + deal.id,
    color: 'danger',
    attachment_type: 'default',
    actions: [
      {
        name: 'undelete-deal',
        text: 'Undelete!',
        type: 'button',
        value: deal.id
      }
    ]
  }
}

function getDeleteDealPart(deal) {
  return {
    fallback: 'Do you want to delete this deal?',
    title: 'Do you want to delete this deal?',
    callback_id: 'Deal:' + deal.id,
    color: 'danger',
    attachment_type: 'default',
    actions: [
      {
        name: 'delete-deal',
        text: 'Delete!',
        type: 'button',
        style: 'danger',
        value: deal.id
      }
    ]
  }
}

function getMainPartFields(deal) {
  const fields = [
    {
      title: 'Side',
      value: deal.deal_type,
      short: true
    },
    {
      title: 'Property Type',
      value: deal.property_type,
      short: true
    },
    {
      title: 'Team',
      value: deal.brand.name,
      short: true
    },
    {
      title: 'Ender Type',
      value: getEnderType(deal).text,
      short: true
    }
  ]

  if (deal.is_draft) {
    fields.push({
      title: 'Draft?',
      value: 'Yes',
      short: true
    })
  }

  if (deal.deleted_at) {
    fields.push({
      title: 'Deleted At',
      value: moment(deal.deleted_at * 1000).format('YYYY-MM-DD HH:mm'),
      short: true
    })
  }

  return fields
}

function getMainPart(deal) {
  const primaryAgent = getPrimaryAgent(deal)
  const fields = getMainPartFields(deal)
  const main = {
    title: deal.title,
    author_name: primaryAgent.legal_full_name,
    fields
  }

  if (primaryAgent.user) {
    if (primaryAgent.user.profile_image_url) {
      main.author_icon = primaryAgent.user.profile_image_url
    } else if (primaryAgent.user.agent) {
      main.author_icon = primaryAgent.user.agent.profile_image_url
    }
  }

  if (deal.mls_context.photo) {
    main.image_url = deal.mls_context.photo
  }

  if (deal.is_draft) {
    main.color = 'warning'
  }

  if (deal.deleted_at) {
    main.color = 'danger'
  }

  return main
}

function getAttachments(deal) {
  /** @type {any[]} */
  const attachments = [getMainPart(deal)]

  if (deal.deleted_at) {
    attachments.push(getUndeleteDealPart(deal))
  } else {
    attachments.push(getChangeEnderTypePart(deal))
    attachments.push(getDeleteDealPart(deal))
  }

  return attachments
}

async function command(deal_id) {
  try {
    const deal = await getDealById(deal_id)
    const msg = {
      attachments: getAttachments(deal)
    }

    return msg
  } catch (ex) {
    console.error(ex)
    return {
      text: 'No deal found'
    }
  }
}

module.exports = {
  command
}
