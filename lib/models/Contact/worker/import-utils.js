const { format } = require('util')
const Context = require('../../Context')

const addressParser = require('parse-address')
const mapValues = require('lodash/mapValues')
const isNil = require('lodash/isNil')
const keyBy = require('lodash/keyBy')
const pick = require('lodash/pick')
const moment = require('moment')

const Contact = require('..')
const Slack = require('../../Slack')
const User = require('../../User/get')
const Brand = require('../../Brand/get')

const AttributeDef = require('../attribute_def/get')

class EmptyLineError extends Error {
  constructor() {
    super('Empty line')
  }
}

class AttributeDefNotSpecifiedError extends Error {
  /** @param {string} field */
  constructor(field) {
    super(`WARN: No attribute_def specified in mapping for column ${field}.`)
  }
}

/**
 * @param {IUser['id']} user_id
 * @param {IBrand['id']} brand_id
 * @param {number} total_contacts
 * @param {string} import_type
 */
async function sendSlackSupportMessage(user_id, brand_id, total_contacts, import_type) {
  const user = await User.get(user_id)
  const brand = await Brand.get(brand_id)

  Context.log(`Job import ${import_type.toLowerCase()}: Finished importing ${total_contacts} contacts from ${import_type} for user ${user.email}.`)

  const text = format(
    '<mailto:%s|%s> imported %d contacts into %s from %s',
    user.email,
    user.display_name,
    total_contacts,
    brand.name,
    import_type
  )

  Slack.send({
    channel: '6-support',
    text: text,
    emoji: ':busts_in_silhouette:'
  })
}

/**
 * 
 * @param {string[]} row 
 * @param {string[]} header 
 * @param {Map<string, ICSVImporterMapping>} mappedFields 
 * @param {IContactAttributeDef[]} defs 
 * @param {{ user: UUID }} base 
 * @param {string} sourceType
 */
function parseRow(row, header, mappedFields, defs, base, sourceType) {
  const defs_by_name = keyBy(defs, 'name')

  /** @type {IContactInput} */
  const contact = {
    ...base,
    attributes: []
  }

  for (let i = 0; i < header.length; i++) {
    const field = header[i]
    const mapping = mappedFields.get(field)
    if (!mapping) continue

    const { def, is_partner, index, label } = mapping
    if (!def) {
      throw Error.Validation(`Invalid mapping for ${field}`)
    }

    const attr_index = index || 0

    const fieldValue = row[i]
    if (!fieldValue) {
      continue
    }

    if (def.name === 'full_address') {
      if (isNil(index)) {
        throw Error.Validation('Invalid index for full address mapping')
      }

      try {
        for (const attr of parseFullAddress(fieldValue.toString().trim(), index)) {
          contact.attributes.push(attr)
        }
      } catch (ex) {
        Context.error(ex)
        throw Error.Validation(`Unable to parse '${fieldValue}' as a full address`)
      }
    } else if (mapping.multivalued) {
      for (const v of fieldValue.split(',')) {
        const attr = parseAttribute(field, def, v, is_partner, label, attr_index)
        if (!attr) continue
        contact.attributes.push(attr)
      }
    } else {
      const attr = parseAttribute(field, def, fieldValue, is_partner, label, attr_index)
      if (!attr) continue
      contact.attributes.push(attr)
    }
  }

  if (contact.attributes.length < 1) {
    throw new EmptyLineError()
  }

  contact.attributes.push({
    attribute_def: defs_by_name['source_type'].id,
    text: sourceType
  })

  return contact
}

/**
 * @param {string} field
 * @param {IContactAttributeDef} def
 * @param {string} value
 */
function parseValue(field, def, value) {
  if (def.data_type === 'text' && (!value || value.length < 1)) {
    return null
  }

  if (def.name === 'phone_number') {
    return value && value.replace(/\s/g, '').replace(/^00/, '+')
  }

  if (def.data_type === 'date') {
    return value && moment(value).isValid() ? moment(value).unix() : null
  }

  if (def.name === 'note') {
    return `${field}: ${value}`
  }

  return value
}

/**
 * @param {string} value 
 * @param {number} index
 */
function* parseFullAddress(value, index) {
  const parsed = addressParser.parseLocation(value)
  if (!parsed) {
    Context.log(`Unable to parse '${value}' as a full address`)
    return
  }

  if (parsed.number) yield { attribute_type: 'street_number', index, text: parsed.number }
  if (parsed.prefix) yield { attribute_type: 'street_prefix', index, text: parsed.prefix }
  if (parsed.suffix) yield { attribute_type: 'street_suffix', index, text: parsed.suffix }

  if (parsed.street && parsed.type) {
    yield { attribute_type: 'street_name', index, text: `${parsed.street} ${parsed.type}` }
  } else if (parsed.street) {
    yield { attribute_type: 'street_name', index, text: parsed.street }
  }

  if (parsed.city) yield { attribute_type: 'city', index, text: parsed.city }
  if (parsed.state) yield { attribute_type: 'state', index, text: parsed.state }
  if (parsed.zip) yield { attribute_type: 'postal_code', index, text: parsed.zip }
  if (parsed.sec_unit_num && parsed.sec_unit_type) {
    yield { attribute_type: 'unit_number', index, text: `${parsed.sec_unit_type} ${parsed.sec_unit_num}` }
  } else if (parsed.sec_unit_num) {
    yield { attribute_type: 'unit_number', index, text: parsed.sec_unit_num }
  }
}

/**
 * @param {string} field
 * @param {IContactAttributeDef} def
 * @param {{}} fieldValue
 * @param {boolean | null | undefined} is_partner
 * @param {string | null | undefined} label
 * @param {number | null | undefined} attr_index
 * @returns {IContactAttributeInput | undefined}
 */
function parseAttribute(field, def, fieldValue, is_partner, label, attr_index) {
  const parsedValue = parseValue(
    field,
    def,
    fieldValue.toString().trim()
  )

  if (parsedValue === null) {
    Context.log(`WARN: Parsed value is null for column ${field}.`)
    return
  }

  /** @type {IContactAttributeInput} */
  const attr = {
    attribute_def: def.id,
    is_partner: Boolean(is_partner),
    [def.data_type]: parsedValue
  }

  if (label) {
    attr.label = label
  }

  if (def.section === 'Addresses') attr.index = (attr_index ?? 0) + 1

  return attr
}

/**
 * @param {IBrand['id']} brandId
 * @param {Record<string, ICSVImporterMappingDef>} mappingDefs
 */
async function prepareMappingDefs(brandId, mappingDefs) {
  const defIds = await AttributeDef.getForBrand(brandId)
  const defs = await AttributeDef.getAll(defIds)
  const defsById = keyBy(defs, 'id')
  const defsByName = keyBy(defs, 'name')

  /**
   * @param {ICSVImporterMappingDef} m
   * @param {string} field
   */
  function getDef(m, field) {
    if (m.attribute_type === 'full_address') return { name: 'full_address' }
    if (m.attribute_def) return defsById[m.attribute_def]
    if (m.attribute_type) return defsByName[m.attribute_type]
    throw new AttributeDefNotSpecifiedError(field)
  }

  const mappings = mapValues(mappingDefs, (m, field) => ({
    ...pick(m, 'label', 'index', 'is_partner', 'multivalued'),
    def: getDef(m, field),
  }))

  return { mappings: new Map(Object.entries(mappings)), defs }
}

/**
 * @param {object} opts
 * @param {IUser['id']} opts.userId
 * @param {IBrand['id']} opts.brandId
 * @param {TContactActionReason=} [opts.reason]
 * @param {number=} [opts.payload]
 */
function contactCargo({ userId, brandId, reason = 'import_xlsx', payload = 2048 }) {
  // TODO: use async.cargo / async.queue / async.cargoQueue instead
  const inputs = []
  const ids = []

  /** @returns {Promise<IContact['id'][]>} */
  async function flush() {
    if (!inputs.length) { return ids }

    const newIds = await Contact.create(inputs, userId, brandId, reason)

    ids.push(...newIds)
    inputs.length = 0
    return ids
  }

  /**
   * @param {IContactInput} input
   * @returns {Promise<IContact['id'][]>}
   */
  async function push(input) {
    inputs.push(input)
    return inputs.length >= payload ? flush() : ids
  }

  return { push, flush }
}

module.exports = {
  sendSlackSupportMessage,
  prepareMappingDefs,
  parseRow,
  EmptyLineError,
  contactCargo,
}
