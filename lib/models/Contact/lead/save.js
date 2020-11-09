const db = require('../../../utils/db')
const promisify = require('../../../utils/promisify')

const Contact = {
  ...require('../manipulate'),
  ...require('../fast_filter'),
  ...require('../get'),
}

const Agent = require('../../Agent/get')
const Brand = require('../../Brand/access')
const Notification = require('../../Notification/issue')
const User = require('../../User/get')

/**
 * stores raw xml LTS payload
 * @param {UUID} user 
 * @param {UUID} brand 
 * @param {string} payload 
 * @returns {Promise<import('./types').ILtsLead>}
 */
async function insert(user, brand, payload) {
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
    text: 'LtsLead'
  }, {
    attribute_type: 'source',
    text: lead.lead_source
  }, {
    attribute_type: 'tag',
    text: lead_source_type
  }]

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

  if (lead.country) {
    attrs.push({
      attribute_type: 'country',
      text: lead.country,
      index: 0
    })
  }

  if (lead.unit_number) {
    attrs.push({
      attribute_type: 'unit_number',
      text: lead.unit_number,
      index: 0
    })
  }

  if (lead.street_number) {
    attrs.push({
      attribute_type: 'street_number',
      text: lead.street_number,
      index: 0
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
 * @param {import('./types.js').ILtsLeadUrlMetadata} link_metadata 
 * @param {import('./types.js').ILtsLead} lead 
 * @returns {Promise<IContact>}
 */
async function _createContact(link_metadata, lead) {
  const { user, brand } = link_metadata

  const [id] = await Contact.create([{
    attributes: _attributes(lead, link_metadata.source, true),
    user,
    parked: true,
  }], user, brand, 'lts_lead')

  return Contact.get(id)
}

/**
 * @param {IContact} contact 
 * @param {import('./types.js').ILtsLead} lead
 * @param {import('./types.js').ILtsLeadUrlMetadata} link_metadata
 */
async function _updateContact(contact, lead, link_metadata) {
  const { user, brand } = link_metadata

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
      if (lead[k] && (v.every(x => x?.toLowerCase() !== lead[k]?.toLowerCase()))) {
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
      attributes: _attributes(to_update, link_metadata.source, false)
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
 * @returns {Promise<UUID | null>}
 */
async function findTeamMember(link_metadata, agent_mlsid) {
  const agents = await Agent.getByMLSID(agent_mlsid)
  const agent = agents.find(a => link_metadata.mls?.includes(a.mls))
  if (!agent) return link_metadata.user

  const user = await User.getByAgentId(agent.id)
  if (!user) return link_metadata.user

  const access_table = await Brand.hasAccessToBrands(link_metadata.brand, user.id, null)
  if (!access_table[link_metadata.brand]) return link_metadata.user

  return user.id
}

/**
 * @param {import('./types').ILtsLeadUrlMetadata} link_metadata 
 * @param {import('./types.js').ILtsLead} lead
 * @param {IContact} contact
 */
async function sendNotification(link_metadata, lead, contact) {
  const user = await findTeamMember(link_metadata, lead.agent_mlsid)

  const notification = {
    title: `${link_metadata.source} Lead: ${contact.display_name}`,
    object: contact.id,
    object_class: 'Contact',
    subject: user,
    subject_class: 'User',
    action: 'Captured',
    data: {
      message: lead.note || 'Open the notification for details'
    },
    message: '',
  }

  return promisify(Notification.issueForUser)(notification, user)
}

/**
 * @param {import('./types').ILtsLeadUrlMetadata} link_metadata 
 * @param {string} payload 
 */
async function save(link_metadata, payload) {
  const { user, brand } = link_metadata
  const lead = await insert(user, brand, payload)

  let contact = await _findContact(lead.email, user, brand)
  if (contact) {
    await _updateContact(contact, lead, link_metadata)
  } else {
    contact = await _createContact(link_metadata, lead)
  }

  await sendNotification(link_metadata, lead, contact)
}

module.exports = {
  save
}
