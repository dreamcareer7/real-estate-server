const moment = require('moment')

const { NotFound } = require('./errors')
const { get, getPrimaryAgent, dealLink } = require('./deal')
const { getBrandsForUser } = require('./brand')

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
    title: 'Change ender type',
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

async function getChangeBrandPart(deal) {
  const created_by = deal.created_by.email
  let creator_brands

  try {
    creator_brands = await getBrandsForUser(created_by)
  }
  catch (ex) {
    if (ex instanceof NotFound) return
    throw ex
  }

  const options = creator_brands.map(b => ({
    value: b.id,
    text: `${b.name} (${b.parent_name})`
  }))

  const current_brand = options.find(o => o.value === deal.brand.id)

  return {
    title: 'Move deal to another team',
    attachment_type: 'default',
    callback_id: 'Deal:' + deal.id,
    actions: [
      {
        name: 'change_deal_brand',
        text: 'Choose a team...',
        type: 'select',
        options,
        selected_options: [current_brand]
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

function getChangePrimaryAgentPart(deal) {
  const pa = getPrimaryAgent(deal)

  const selected_options = pa
    ? [{
      text: pa.legal_full_name,
      value: pa.id
    }]
    : undefined

  return {
    title: 'Change primary agent',
    attachment_type: 'default',
    callback_id: 'Deal:' + deal.id + (pa ? ':' + pa.id : ''),
    actions: [
      {
        name: 'change_deal_primary_agent',
        text: 'Select a role...',
        type: 'select',
        options: deal.roles.map(r => ({
          text: `${r.legal_full_name} (${r.role})`,
          value: r.id
        })),
        selected_options
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
  const primaryAgent = getPrimaryAgent(deal) || {}

  const fields = getMainPartFields(deal)
  const main = {
    title: deal.title,
    title_link: dealLink(deal.id),
    author_name: primaryAgent.legal_full_name,
    fields
  }

  if (deal.created_by) {
    main.footer =
      'Created by ' +
      `<mailto:${deal.created_by.email}|${deal.created_by.display_name}>` +
      ` <!date^${Math.floor(deal.created_at)}^at {date_short} {time}|at ${
        deal.created_at
      }>`
  }

  if (primaryAgent.user) {
    if (primaryAgent.user.profile_image_url) {
      main.author_icon = primaryAgent.user.profile_image_url
    } else if (primaryAgent.user.agent) {
      main.author_icon = primaryAgent.user.agent.profile_image_url
    }
  }

  if (deal.mls_context && deal.mls_context.photo) {
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

async function getAttachments(deal) {
  /** @type {any[]} */
  const attachments = [getMainPart(deal)]

  if (deal.deleted_at) {
    attachments.push(getUndeleteDealPart(deal))
  } else {
    attachments.push(getChangePrimaryAgentPart(deal))
    attachments.push(await getChangeBrandPart(deal))
    attachments.push(getChangeEnderTypePart(deal))
    attachments.push(getDeleteDealPart(deal))
  }

  return attachments
}

async function command(deal_id) {
  try {
    const deal = await get(deal_id)
    const msg = {
      attachments: await getAttachments(deal)
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
