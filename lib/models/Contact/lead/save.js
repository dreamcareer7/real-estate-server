const { expect } = require('chai')
const format = require('util').format
const db = require('../../../utils/db')
const sql = require('../../../utils/sql')
const promisify = require('../../../utils/promisify')

const Contact = {
  ...require('../manipulate'),
  ...require('../fast_filter'),
  ...require('../get'),
}

const Agent = require('../../Agent/get')
const Brand = require('../../Brand/access')
const Notification = {
  ...require('../../Notification/issue'),
  ...require('../../Notification/delivery'),
}
const Slack = require('../../Slack')
const User = {
  ...require('../../User/get'),
  ...require('../../User/create'),
}

const Mailer = require('./mailer')

/**
 * stores raw xml LTS payload
 * @param {UUID} user 
 * @param {UUID} brand 
 * @param {string} payload 
 * @returns {Promise<import('./types').ILtsLead>}
 */
async function insertLTS(user, brand, payload) {
  return db.selectOne('contact/lead/save', [
    brand,
    user,
    payload
  ])
}

/**
 * @param {Partial<import('./types.js').ILtsLead>} lead
 * @param {import('./types.js').ELeadSourceType} lead_source_type
 * @returns {IContactAttributeInput[]}
 * @param {boolean} is_new_contact
 */
function _attributes(lead, lead_source_type, is_new_contact) {
  /** @type {IContactAttributeInput[]} */
  const attrs = !is_new_contact ? [] : [{
    attribute_type: 'source_type',
    text: lead_source_type
  }, {
    attribute_type: 'source',
    text: lead.lead_source
  }, {
    attribute_type: 'tag',
    text: lead_source_type
  }, {
    attribute_type: 'tag',
    text: 'Lead'
  }].filter(a => Boolean(a.text))

  if (lead.tag) {
    if (Array.isArray(lead.tag)) {
      for (const t of lead.tag) {
        attrs.push({
          attribute_type: 'tag',
          text: t.trim()
        })
      }
    } else {
      for (const t of lead.tag.split(',')) {
        attrs.push({
          attribute_type: 'tag',
          text: t.trim()
        })
      }
    }
  }

  if (lead.first_name) {
    attrs.push({
      attribute_type: 'first_name',
      text: lead.first_name
    })
  }

  if (lead.last_name) {
    attrs.push({
      attribute_type: 'last_name',
      text: lead.last_name
    })
  }

  if (lead.email) {
    attrs.push({
      attribute_type: 'email',
      text: lead.email
    })
  }

  if (lead.phone_number) {
    attrs.push({
      attribute_type: 'phone_number',
      text: lead.phone_number
    })
  }

  if (lead.company) {
    attrs.push({
      attribute_type: 'company',
      text: lead.company
    })
  }

  if (lead.note) {
    attrs.push({
      attribute_type: 'note',
      text: `<div>Contact comments:</div>\n<div>${lead.note}</div>`
    })
  }

  return attrs
}

/**
 * Create a new contact for a lead
 * @param {UUID} user
 * @param {UUID} brand
 * @param {import('./types').ELeadSourceType} source
 * @param {import('./types.js').ILtsLead} lead
 * @returns {Promise<IContact>}
 */
async function _createContact(user, brand, source, lead, leadChannel) {
  const [id] = await Contact.create([{
    attributes: _attributes(lead, source, true),
    user,
    lead_channel: leadChannel
  }], user, brand, 'lts_lead')

  return Contact.get(id)
}

/**
 * @param {IContact} contact
 * @param {import('./types.js').ILtsLead} lead
 * @param {import('./types').ELeadSourceType} source
 * @param {UUID} user
 * @param {UUID} brand
 */
async function _updateContact(contact, lead, source, user, brand) {
  /** @type {Partial<import('./types.js').ILtsLead>} */
  const to_update = {}

  const attr_summary_key_map = {
    email: 'emails',
    tag: 'tags',
    phone_number: 'phone_numbers',
    lead_source: 'source'
  }

  for (const k in lead) {
    const v = contact[attr_summary_key_map[k] || k]

    if (Array.isArray(v)) {
      // FIXME: we should handle the case when x is undefined gracefully.
      if (lead[k] && (v.every(x => x?.toLowerCase?.() !== lead[k]?.toLowerCase?.()))) {
        to_update[k] = lead[k]
      }
    } else {
      if (lead[k] && (v?.toLowerCase() !== lead[k]?.toLowerCase())) {
        to_update[k] = lead[k]
      }
    }
  }

  if (lead.note) {
    to_update.note = lead.note
  }

  if (Object.keys(to_update).length > 0) {
    await Contact.update([{
      id: contact.id,
      attributes: _attributes(to_update, source, false)
    }], user, brand, 'lts_lead')
  }
}

/**
 * @param {string | undefined} email 
 * @param {UUID | undefined} user 
 * @param {UUID} brand 
 */
async function _findContact(email, user, brand) {
  if (!email) return

  const res = await Contact.fastFilter(brand, [{
    attribute_type: 'email',
    value: email
  }], { users: user ? [ user ] : undefined })

  if (res.total > 0) {
    return Contact.get(res.ids[0])
  }
}

/**
 * @param {import('./types').ILtsLeadUrlMetadata} link_metadata
 * @param {string} agent_mlsid 
 * @returns {Promise<IUser>}
 */
async function findTeamMember(link_metadata, agent_mlsid) {
  const getUser = () => {
    return User.get(link_metadata.user)
  }
  let agent
  if (agent_mlsid) {
    const agents = await Agent.getByMLSID(agent_mlsid)
    agent = agents.find(a => link_metadata.mls?.includes(a.mls))
  }
  
  if (!agent) return getUser()

  const user = await User.getByAgentId(agent.id)
  if (!user) return getUser()

  const access_table = await Brand.hasAccessToBrands(link_metadata.brand, user.id, null)
  if (!access_table[link_metadata.brand]) return getUser()

  return user
}

/**
 * @param {import('./types').ILtsLeadUrlMetadata} link_metadata 
 * @param {UUID} user
 * @param {string} note
 * @param {IContact} contact
 */
async function sendNotification(link_metadata, user, note, contact) {
  const notification = {
    title: `${link_metadata.source} Lead: ${contact.display_name}`,
    object: contact.id,
    object_class: 'Contact',
    subject: user,
    subject_class: 'User',
    action: 'Captured',
    data: {
      message: note || 'Open the notification for details'
    },
    message: '',
  }

  return promisify(Notification.issueForUser)(notification, user)
}

/**
 * @param {import('./types').ILtsLead} lead
 * @param {IUser} user
 * @param {IContact} contact
 */
async function sendEmailToAgent(lead, user, contact) {
  const mailer = new Mailer({
    address: lead.address,
    message: lead.message,
    phone_number: lead.phone_number,
    email: lead.email,
    contact,
    user,
  })
  await mailer.send()
}

/**
 * @param {UUID} user_id 
 * @param {IContact} contact 
 * @param {import('./types').ELeadSourceType} source 
 */
async function sendSlackSupportMessage(user_id, contact, source) {
  const user = await User.get(user_id)

  const text = format(
    '<mailto:%s|%s> captured a lead called "%s" from %s',
    user.email,
    user.display_name,
    contact.display_name,
    source
  )

  Slack.send({
    channel: '6-support',
    text: text,
    emoji: ':busts_in_silhouette:'
  })
}

/**
 * @param {UUID} contact_id 
 */
async function setLastTouchToNow(contact_id) {
  await sql.update('UPDATE contacts SET last_touch = NOW() WHERE id = $1', [ contact_id ])
}

/**
 * 
 * @param {TLeadProtocol} protocol 
 * @param {UUID} user
 * @param {UUID} brand
 * @param {*} payload 
 * @returns {Promise<import('./types').ILtsLead>}
 */
async function parsePayload(protocol, user, brand, payload) {
  switch (protocol) {
    case 'LeadTransmissionStandard':
      return await insertLTS(user, brand, payload)
    case 'FormData':
    case 'JSON':
      return payload
    default:
      throw Error.Validation('Unexpected lead data format.')
  }
}

/**
 * @param {import('./types').ILtsLead} payload 
 * 
 */
async function createUserAndLogActivity(payload) {

}

/**
 * @param {TLeadProtocol} protocol 
 * @param {import('./types').ILtsLead} payload 
 * @param {import('./types').ELeadSourceType} source 
 * @param {UUID} user 
 * @param {UUID} brand 
 * @returns {Promise<{ contact: IContact; lead: import('./types').ILtsLead; isUpdated: boolean }>}
 */
async function saveContact(protocol, payload, source, user, brand) {
  expect(user).not.be.null.and.undefined
  const lead = await parsePayload(protocol, user, brand, payload)

  if (payload.listing_number && (payload.email || payload.phone_number)) {
    await createUserAndLogActivity(payload)
  }

  
  let contact = await _findContact(lead.email, user, brand)
  const isUpdated = contact ? true : false
  if (contact) {
    await _updateContact(contact, lead, source, user, brand)
  } else {
    contact = await _createContact(user, brand, source, lead, payload.lead_channel)
  }
  await setLastTouchToNow(contact.id)

  return { lead, contact, isUpdated }
}

/**
 * @param {import('./types').ILtsLeadUrlMetadata} link_metadata 
 * @param {*} payload 
 */
async function saveAndNotify(link_metadata, payload) {
  const { user: user_id, brand, source, notify = true } = link_metadata
  const { lead, contact, isUpdated } = await saveContact(link_metadata.protocol, payload, source, user_id, brand)

  const user = await findTeamMember(link_metadata, lead.agent_mlsid)
  if (notify) {
    await sendNotification(link_metadata, user.id, lead.note, contact)
    await sendEmailToAgent(lead, user, contact)
    sendSlackSupportMessage(user_id, contact, link_metadata.source || 'Website')
  }

  return { lead, contact, isUpdated }
}

module.exports = {
  saveContact,
  saveAndNotify,
  findContact: _findContact,
}
