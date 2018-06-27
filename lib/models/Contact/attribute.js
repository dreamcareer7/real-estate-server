const _ = require('lodash')

const squel = require('../../utils/squel_extensions')
const validator = require('../../utils/validator.js')
const belt = require('../../utils/belt')
const db = require('../../utils/db')

const Orm = require('../Orm')
const AttributeDef = require('./attribute_def')

const attributeFilterQuery = require('./filter')

const expect = validator.expect

const formatters = {
  email: function(attr) {
    attr.text = attr.text ? attr.text.toLowerCase() : attr.text
  }
}

/**
 * Loads attribute defs for a user plus any additional def ids needed
 * @param {UUID} user_id 
 * @param {UUID[]} additional_defs 
 */
async function loadUserAttributeDefs(user_id, additional_defs = []) {
  const defs_for_user = await AttributeDef.getForUser(user_id)
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
  }
}

/**
 * Normalize and clean contact attributes before create or update
 * @param {IContactAttributeInput[]} attributes
 * @param {Record<UUID, IContactAttributeDef>} defs_by_id
 */
function normalizeAttributes(attributes, defs_by_id) {
  for (let i = 0; i < attributes.length; i++) {
    const attr = attributes[i]
    const def = defs_by_id[attr.attribute_def]

    ContactAttribute.validate(attr, defs_by_id)

    if (def.name === 'email') {
      formatters.email(attr)
    }

    if (def.data_type === 'date') {
      attr.date = belt.epochToDate(attr.date).toISOString()
    }

    attr.attribute_type = def.name
  }

  return attributes
}

/**
 * Updates updated_at and searchable_field if necessary
 * @param {UUID[]} contact_ids 
 * @param {boolean} update_searchable_field 
 */
function set_updated_at_for_contacts(contact_ids, update_searchable_field) {
  const query = update_searchable_field ?
    'contact/update_with_searchable_field' :
    'contact/set_updated_at'

  return db.update(query, [contact_ids])
}

class ContactAttribute {
  static validate(attribute, defs_by_id) {
    if (typeof attribute.attribute_def !== 'string') {
      throw Error.Validation('Attribute definition is not specified.')
    }

    if (typeof attribute.contact !== 'string') {
      throw Error.Validation('Contact is not specified.')
    }

    const def = defs_by_id[attribute.attribute_def]

    if (!def) {
      throw Error.Validation(
        `Attribute definition ${attribute.attribute_def} not found.`
      )
    }

    switch (def.data_type) {
      case 'text':
        expect(attribute.text).to.be.a('string')
        break
      case 'number':
      case 'date':
      default:
        expect(attribute[def.data_type]).to.be.a('number')
        break
    }
  }

  /**
   * Get contact attributes by id without any restriction
   * @param {UUID[]} ids
   * @returns {Promise<IContactAttribute[]>}
   */
  static async getAll(ids) {
    const attributes = await db.select('contact/attribute/get', [ids])

    return attributes
  }

  /**
   * Get a ContactAttribute by id
   * @param {UUID} id ContactAttribute id
   */
  static async get(id) {
    const attributes = await ContactAttribute.getAll([id])

    if (!attributes || attributes.length < 1) {
      throw Error.ResourceNotFound(`ContactAttribute ${id} not found`)
    }

    return attributes[0]
  }

  /**
   * Gets all attributes for a given contact
   * @param {UUID[]} contact_ids
   * @returns {Promise<IContactAttribute[]>}
   */
  static async getForContacts(contact_ids) {
    const ids = await db.selectIds('contact/attribute/for_contacts', [
      contact_ids
    ])

    if (ids.length < 1) return []

    return ContactAttribute.getAll(ids)
  }

  /**
   * Generate a squel query for complex filtering on attributes
   * @param {IContactAttributeFilter[]} attribute_filters Attribute filters
   */
  static async filterQuery(attribute_filters) {
    const def_ids_to_get = attribute_filters.map(af => af.attribute_def)
    const defs = await AttributeDef.getAll(def_ids_to_get)
    const defs_by_id = _.keyBy(defs, 'id')

    return attributeFilterQuery(attribute_filters, defs_by_id)
  }

  /**
   * Create multiple attributes
   * @param {IContactAttributeInput[]} attributes
   * @param {UUID} user_id Creator of the attributes
   * @returns {Promise<UUID[]>}
   */
  static async create(attributes, user_id) {
    if (!attributes || attributes.length < 1) return []

    const defs_by_id = await loadUserAttributeDefs(user_id, attributes.map(attr => attr.attribute_def))
    const fields = [
      'created_by',
      'contact',
      'attribute_def',
      'attribute_type',
      'text',
      'date',
      'number',
      'label',
      'is_primary',
      'index'
    ]

    attributes = attributes.map(attr => _.pick(attr, fields))
    normalizeAttributes(attributes, defs_by_id)
    ensureFieldsOnAttributes(attributes, fields)

    const LIBPQ_PARAMETER_LIMIT = 0xFFFF

    try {
      const result = await Promise.all(_(attributes)
        .chunk(Math.floor(LIBPQ_PARAMETER_LIMIT / fields.length))
        .map((chunk, i) => {
          const q = squel
            .insert()
            .into('contacts_attributes')
            .setFieldsRows(chunk)
            .returning('id')

          q.name = 'contact/attribute/create#' + i
          return db.selectIds(q)
        })
        .value())

      const created_ids = _.flatten(result)

      const affected_contact_ids = new Set(attributes.map(a => a.contact))
      await set_updated_at_for_contacts(Array.from(affected_contact_ids), true)

      return created_ids
    }
    catch (ex) {
      if (ex.constraint === 'unique_index_for_contact_attribute_cst') {
        throw Error.BadRequest(ex.detail)
      }
      else {
        throw ex
      }
    }
  }

  /**
   * Creates multiple attributes for one contact
   * @param {IContactAttribute[]} attributes
   * @param {UUID} contact_id
   * @param {UUID} user_id
   */
  static async createForContact(attributes, contact_id, user_id) {
    for (const attribute of attributes) {
      attribute.user = user_id
      attribute.created_by = user_id
      attribute.contact = contact_id
    }

    const ids = await ContactAttribute.create(attributes, user_id)
    return ContactAttribute.getAll(ids)
  }

  /**
   * Deletes an attribute by id for a contact
   * @param {UUID} contact_id 
   * @param {UUID} attribute_id 
   */
  static async delete(contact_id, attribute_id) {
    const res = await db.update('contact/attribute/delete', [contact_id, attribute_id])
    await db.update('contact/update_with_searchable_field', [[contact_id]])
    return res
  }

  /**
   * Updates a number of a contact's attributes
   * @param {IContactAttribute[]} attributes
   */
  static async update(attributes) {
    if (!Array.isArray(attributes) || attributes.length < 1) return []

    const update_fields = [
      'id',
      'text',
      'date',
      'number',
      'label',
      'is_primary',
      'index'
    ]

    const contact_ids = new Set(attributes.map(attr => attr.contact))
    const contact_attrs = await ContactAttribute.getForContacts(Array.from(contact_ids))
    const attrs_by_id = _.keyBy(contact_attrs, 'id')

    attributes = attributes
      .filter(attr => attrs_by_id[attr.id])
      .map(attr => {
        return Object.assign(attrs_by_id[attr.id], _.pick(attr, update_fields))
      })

    const def_ids = new Set(attributes.map(attr => attr.attribute_def))
    const defs = await AttributeDef.getAll(Array.from(def_ids))
    const defs_by_id = _.keyBy(defs, 'id')

    normalizeAttributes(attributes, defs_by_id)
    attributes = attributes.map(attr => _.pick(attr, update_fields))
    ensureFieldsOnAttributes(attributes, update_fields)

    const LIBPQ_PARAMETER_LIMIT = 0xFFFF

    try {
      const result = await Promise.all(_(attributes)
        .chunk(Math.floor(LIBPQ_PARAMETER_LIMIT / update_fields.length))
        .map((chunk, i) => {
          const q = squel
            .update()
            .withValues('update_values', attributes)
            .table('contacts_attributes', 'ca')
            .set('text = uv.text')
            .set('date = uv.date::timestamptz')
            .set('number = uv.number::float')
            .set('index = uv.index::int2')
            .set('label = uv.label')
            .set('is_primary = uv.is_primary::boolean')
            .from('update_values', 'uv')
            .where('ca.id = (uv.id)::uuid')
            .returning('ca.id')
    
          q.name = 'contact/attribute/update#' + i

          return db.selectIds(q)
        })
        .value())

      const updated_ids = _.flatten(result)
      await set_updated_at_for_contacts(Array.from(contact_ids), defs.some(def => def.searchable))

      return updated_ids
    }
    catch (ex) {
      if (ex.constraint === 'unique_index_for_contact_attribute_cst') {
        throw Error.BadRequest(ex.details)
      }
      else {
        throw ex
      }
    }
  }
}

ContactAttribute.associations = {
  attribute_def: {
    model: 'ContactAttributeDef',
    enabled: false
  }
}

Orm.register('contact_attribute', 'ContactAttribute', ContactAttribute)

module.exports = ContactAttribute
