const db = require('../../../utils/db.js')
const Contact = {
  ...require('../manipulate'),
  ...require('../fast_filter'),
  ...require('../get'),
}

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
 * @returns {Promise<UUID>}
 */
async function _createContact(link_metadata, lead) {
  const { user, brand } = link_metadata

  const [id] = await Contact.create([{
    attributes: _attributes(lead, link_metadata.source, true),
    user,
  }], user, brand, 'lts_lead')

  return id
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

  to_update.note = lead.note || undefined

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
 * 
 * @param {import('./types').ILtsLeadUrlMetadata} link_metadata 
 * @param {string} payload 
 */
async function save(link_metadata, payload) {
  const { user, brand } = link_metadata
  const lead = await insert(user, brand, payload)

  const existing_contact = await _findContact(lead.email, user, brand)
  if (existing_contact) {
    await _updateContact(existing_contact, lead, link_metadata)
  } else {
    await _createContact(link_metadata, lead)
  }
}

module.exports = {
  save
}
