const _ = require('lodash')
const isNil = require('lodash/isNil')

const belt = require('../../../utils/belt')
const db = require('../../../utils/db')
const squel = require('../../../utils/squel_extensions')
const validator = require('../../../utils/validator')

const Context = require('../../Context')
const AttributeDef = require('../attribute_def/get')
const Summary = require('../summary')

const { get, getForContacts } = require('./get')
const Emitter = require('./emitter')

const expect = validator.expect


const formatters = {
  email: function(attr) {
    attr.text = attr.text ? attr.text.toLowerCase() : attr.text
  }
}

/**
 * @param {IContactAttributeInputWithContact} attribute
 * @param {Record<UUID, IContactAttributeDef>} defs_by_id
 */
function validate(attribute, defs_by_id) {
  if (
    typeof attribute.attribute_def !== 'string' &&
    typeof attribute.attribute_type !== 'string'
  ) {
    throw Error.Validation('Attribute definition is not specified.')
  }

  if (typeof attribute.contact !== 'string') {
    throw Error.Validation('Contact is not specified.')
  }

  const def = get_def_from_attribute(attribute, defs_by_id)

  switch (def.data_type) {
    case 'text':
      expect(attribute.text, `The value for ${def.name} should be a text`).to.be.a('string')
      break
    case 'date':
    default:
      expect(attribute[def.data_type]).to.be.a('number')
      break
  }
}

/**
 * Loads attribute defs for a user plus any additional def ids needed
 * @param {UUID} brand_id
 * @param {UUID[]} additional_defs
 */
async function loadUserAttributeDefs(brand_id, additional_defs = []) {
  const defs_for_user = await AttributeDef.getForBrand(brand_id)
  const def_ids_to_get = Array.from(
    new Set(defs_for_user.concat(additional_defs || []))
  )
  const defs = await AttributeDef.getAll(def_ids_to_get)
  return _.keyBy(defs, 'id')
}

function ensureFieldsOnAttributes(attributes, fields) {
  for (const attr of attributes) {
    for (const k of fields) {
      if (attr[k] === undefined) attr[k] = null
    }
    if (attr.is_primary === null) attr.is_primary = false
    if (attr.is_partner === null) attr.is_partner = false
    if (attr.label === '') attr.label = null
  }
}

/**
 * Updates updated_at for contacts
 * @param {UUID[]} contact_ids
 * @param {TContactActionReason} _reason
 */
function set_updated_at_for_contacts(contact_ids, user_id, _reason = 'direct_request') {
  return db.update('contact/set_updated_at', [
    contact_ids,
    user_id,
    Context.getId(),
    _reason
  ])
}

/**
 *
 * @param {IContactAttributeInputWithContact} attr
 * @param {_.Dictionary<IContactAttributeDef>} defs_by_id
 */
function get_def_from_attribute(attr, defs_by_id) {
  let def

  if (attr.attribute_def) {
    def = defs_by_id[attr.attribute_def]
  }
  else if (attr.attribute_type) {
    const defs = Object.values(defs_by_id)
    const defs_by_name = _.keyBy(defs, 'name')

    def = defs_by_name[attr.attribute_type]
  }

  if (!def) {
    throw Error.Validation(
      `Attribute definition ${attr.attribute_type || attr.attribute_def} not found.`
    )
  }

  return def
}

/**
 * Normalize and clean contact attributes before create or update
 * @param {IContactAttributeInputWithContact[]} attributes
 * @param {Record<UUID, IContactAttributeDef>} defs_by_id
 */
function normalizeAttributes(attributes, defs_by_id) {
  for (let i = 0; i < attributes.length; i++) {
    const attr = attributes[i]

    validate(attr, defs_by_id)

    const def = get_def_from_attribute(attr, defs_by_id)
    attr.attribute_def = def.id

    if (def.name === 'email') {
      formatters.email(attr)
    }

    if (def.section === 'Addresses') {
      if (typeof attr.index !== 'number' ) {
        throw Error.Validation('index field on address attributes cannot be empty.')
      }

      if (attr.label === null || attr.label === undefined || attr.label.length < 1) {
        attr.label = 'Home'
      }
    }

    attr.data_type = def.data_type

    if (def.data_type === 'date' && (typeof attr.date === 'number')) {
      attr.date = belt.epochToDate(attr.date).toISOString()
      if (attr.date[0] === '+') {
        attr.date = attr.date.substring(1)
      }
    }

    attr.attribute_type = def.name
  }

  return attributes
}

/**
 * Create multiple attributes
 * @param {IContactAttributeInputWithContact[]} attributes
 * @param {UUID} user_id Creator of the attributes
 * @param {UUID} brand_id Owner of the attributes
 * @param {TContactActionReason} _reason
 */
async function create(attributes, user_id, brand_id, _reason = 'direct_request') {
  if (!attributes || attributes.length < 1) return { attribute_ids: [], affected_contact_ids: [] }

  const defs_by_id = await loadUserAttributeDefs(brand_id)
  const fields = [
    'created_by',
    'created_within',
    'created_for',
    'contact',
    'attribute_def',
    'attribute_type',
    'text',
    'date',
    'label',
    'is_primary',
    'is_partner',
    'index',
    'data_type'
  ]

  const to_create = attributes
    .filter(attr => {
      if (attr.text)
        return attr.text.trim() !== ''

      return attr.text !== ''
    })
    .map(attr => /** @type {IContactAttributeInputWithContact} */({
      ..._.pick(attr, fields),
      created_for: _reason
    }))

  normalizeAttributes(to_create, defs_by_id)
  ensureFieldsOnAttributes(to_create, fields)

  const LIBPQ_PARAMETER_LIMIT = 0xffff

  try {
    const chunks = await Promise.all(
      _(to_create)
        .chunk(Math.floor(LIBPQ_PARAMETER_LIMIT / fields.length))
        .map((chunk, i) => {
          const q = squel
            .insert()
            .into('contacts_attributes')
            .setFieldsRows(chunk)
            .returning('id')
            .returning('is_primary')
            .returning('contact')

          // @ts-ignore
          q.name = 'contact/attribute/create#' + i
          return db.select(q)
        })
        .value()
    )

    const result = chunks.flat()

    const primary_attrs = result.filter(c => c.is_primary).map(c => c.id)
    if (primary_attrs.length > 0) {
      await db.update('contact/attribute/clear_primaries', [ primary_attrs ])
    }

    const attribute_ids = result.map(c => c.id)
    const affected_contact_ids = _.uniq(result.map(c => c.contact))

    await set_updated_at_for_contacts(
      affected_contact_ids,
      user_id,
      _reason
    )

    const created_emails = to_create.filter(a => a.attribute_type === 'email')
    if (created_emails.length > 0) {
      Emitter.emit('create:email', {
        brand: brand_id,
        attributes: created_emails
      })
    }

    const createdDateAttrs = to_create.filter(a => !isNil(a.date))
    if (createdDateAttrs.length) {
      Emitter.emit('create:dateAttribute', {
        brand: brand_id,
        attributes: createdDateAttrs,
      })
    }

    const createdTagAttrs = to_create.filter(a => a.attribute_type === 'tag')
    if (createdTagAttrs.length) {
      Emitter.emit('create:tag', {
        brand: brand_id,
        user: user_id,
        attributes: createdTagAttrs,
      })
    }
    
    return { attribute_ids, affected_contact_ids }
  } catch (ex) {
    if (ex.constraint === 'unique_index_for_contact_attribute_cst') {
      throw Error.BadRequest(ex.detail)
    } else {
      throw ex
    }
  }
}


/**
 * Deletes multiple attributes
 * @param {UUID[]} attribute_ids
 * @param {UUID} user_id
 * @param {TContactActionReason} _reason
 */
async function deleteAttribute(attribute_ids, user_id, _reason = 'direct_request') {
  /**
   * @typedef {'id' | 'contact' | 'attribute_type' | 'date'} DeleteAttrKey
   * @type {Pick<IContactAttribute, DeleteAttrKey>[]}
   */
  const deleted_attrs = await db.select('contact/attribute/delete', [
    attribute_ids,
    user_id,
    Context.getId(),
    _reason
  ])

  const affected_contacts = _.uniq(deleted_attrs.map(a => a.contact))

  await db.update('contact/set_updated_at', [
    affected_contacts,
    user_id,
    Context.getId(),
    _reason
  ])

  await Summary.update(affected_contacts)

  Emitter.emit('delete', { attribute_ids, affected_contacts, user_id, reason: _reason })

  const deleted_emails = deleted_attrs.filter(a => a.attribute_type === 'email')
  if (deleted_emails.length > 0) {
    Emitter.emit('delete:email', {
      attributes: deleted_emails,
      reason: _reason
    })
  }

  // XXX: is it a better idea to check data_type instead of date?
  const deletedDateAttrs = deleted_attrs.filter(a => !isNil(a.date))
  if (deletedDateAttrs.length) {
    Emitter.emit('delete:dateAttribute', {
      attributes: deletedDateAttrs,
      userId: user_id,
      reason: _reason
    })
  }

  return affected_contacts
}

/**
 * Deletes an attribute by id for a contact
 * @param {UUID} contact_id
 * @param {UUID} attribute_id
 * @param {UUID} user_id
 * @param {TContactActionReason} _reason
 */
async function deleteForContact(contact_id, attribute_id, user_id, _reason = 'direct_request') {
  const attr = await get(attribute_id)
  if (!attr || attr.contact !== contact_id) return 0

  await deleteAttribute([attr.id], user_id, _reason)
  return 1
}

/**
 * Updates a number of a contact's attributes
 * @param {IContactAttributeInputWithContact[]} attributes
 * @param {UUID} user_id
 * @param {TContactActionReason} _reason
 * @returns {Promise<Set<UUID>>}
 */
async function update(attributes, user_id, _reason = 'direct_request') {
  if (!Array.isArray(attributes) || attributes.length < 1) return new Set()

  const update_fields = [
    'id',
    'text',
    'date',
    'label',
    'is_primary',
    'index'
  ]

  const audit_fields = [
    'updated_by',
    'updated_for',
    'updated_within'
  ]

  const contact_ids = new Set(attributes.map(attr => attr.contact))
  const contact_attrs = await getForContacts(Array.from(contact_ids))
  const attrs_by_id = _.keyBy(contact_attrs, 'id')

  const merged_attributes = attributes
    .filter(
      /** @type {TIsRequirePropPresent<IContactAttributeInputWithContact, 'id'>} */ (attr =>
        attr.hasOwnProperty('id'))
    )
    .filter(attr => attrs_by_id[attr.id])
    .map(attr => ({ ...attrs_by_id[attr.id], ..._.pick(attr, update_fields) }))

  const def_ids = new Set(merged_attributes.map(attr => attr.attribute_def))
  const defs = await AttributeDef.getAll(Array.from(def_ids))
  const defs_by_id = _.keyBy(defs, 'id')

  normalizeAttributes(merged_attributes, defs_by_id)
  const final_attributes = merged_attributes.map(attr => _.pick(attr, update_fields))
  ensureFieldsOnAttributes(final_attributes, update_fields)

  const LIBPQ_PARAMETER_LIMIT = 0xffff

  try {
    const chunks = await Promise.all(
      _(final_attributes)
        .chunk(Math.floor(LIBPQ_PARAMETER_LIMIT / (update_fields.length + audit_fields.length)))
        .map((chunk, i) => {
          const q = squel
            .update()
            .withValues('update_values', chunk)
            .table('contacts_attributes', 'ca')
            .set('text = uv.text')
            .set('date = uv.date::timestamptz')
            .set('index = uv.index::int2')
            .set('label = uv.label')
            .set('is_primary = uv.is_primary::boolean')
            .set('updated_at = now()')
            .set('updated_by = ?', user_id)
            .set('updated_for = ?', _reason)
            .set('updated_within = ?', Context.getId())
            .from('update_values', 'uv')
            .where('ca.id = (uv.id)::uuid')
            .returning('ca.id')
            .returning('ca.is_primary')

          // @ts-ignore
          q.name = 'contact/attribute/update#' + i

          return /** @type {Promise<{ id: UUID; is_primary: boolean; }[]>} */(db.select(q))
        })
        .value()
    )

    const result = chunks.flat()

    const primary_attrs = result.filter(c => c.is_primary).map(c => c.id)
    if (primary_attrs.length > 0) {
      await db.query.promise('contact/attribute/clear_primaries', [ primary_attrs ])
    }

    await set_updated_at_for_contacts(Array.from(contact_ids), user_id, _reason)

    const updated_emails = merged_attributes.filter(a => a.attribute_type === 'email')
    if (updated_emails.length > 0) {
      Emitter.emit('update:email', {
        attributes: updated_emails
      })
    }
    
    return contact_ids
  } catch (ex) {
    if (ex.constraint === 'unique_index_for_contact_attribute_cst') {
      throw Error.BadRequest(ex.details)
    } else {
      throw ex
    }
  }
}

module.exports = {
  create,
  update,
  delete: deleteAttribute,
  deleteForContact,
}
