const { EventEmitter } = require('events')

const _ = require('lodash')

const squel = require('../../utils/squel_extensions')
const validator = require('../../utils/validator.js')
const belt = require('../../utils/belt')
const db = require('../../utils/db')

const Orm = require('../Orm')
const AttributeDef = require('./attribute_def')

const expect = validator.expect

const formatters = {
  email: function(attr) {
    attr.text = attr.text ? attr.text.toLowerCase() : attr.text
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
  }
}

/**
 * Updates updated_at for contacts
 * @param {UUID[]} contact_ids
 */
function set_updated_at_for_contacts(contact_ids, user_id) {
  return db.update('contact/set_updated_at', [contact_ids, user_id])
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
      `Attribute definition ${attr.attribute_def} not found.`
    )
  }

  return def
}

class ContactAttribute extends EventEmitter {
  /**
   * @param {IContactAttributeInputWithContact} attribute
   * @param {Record<UUID, IContactAttributeDef>} defs_by_id
   */
  validate(attribute, defs_by_id) {
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
  async getAll(ids) {
    const attributes = await db.select('contact/attribute/get', [ids])

    return attributes
  }

  /**
   * Get a ContactAttribute by id
   * @param {UUID} id ContactAttribute id
   */
  async get(id) {
    const attributes = await this.getAll([id])

    if (!attributes || attributes.length < 1) {
      throw Error.ResourceNotFound(`ContactAttribute ${id} not found`)
    }

    return attributes[0]
  }

  /**
   * Gets all attributes for a given contact
   * @param {UUID[]} contact_ids
   * @param {UUID[]=} attribute_defs
   * @returns {Promise<IContactAttribute[]>}
   */
  async getForContacts(contact_ids, attribute_defs) {
    const ids = await db.selectIds('contact/attribute/for_contacts', [
      contact_ids,
      attribute_defs
    ])

    if (ids.length < 1) return []

    return this.getAll(ids)
  }

  /**
   * Normalize and clean contact attributes before create or update
   * @param {IContactAttributeInputWithContact[]} attributes
   * @param {Record<UUID, IContactAttributeDef>} defs_by_id
   */
  normalizeAttributes(attributes, defs_by_id) {
    for (let i = 0; i < attributes.length; i++) {
      const attr = attributes[i]

      this.validate(attr, defs_by_id)

      const def = get_def_from_attribute(attr, defs_by_id)
      attr.attribute_def = def.id

      if (def.name === 'email') {
        formatters.email(attr)
      }

      if (def.section === 'Addresses' && typeof attr.index !== 'number' ) {
        throw Error.Validation('index field on address attributes cannot be empty.')
      }

      if (def.data_type === 'date' && attr.date) {
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
   * @param {UUID} brand_id Owner of the attributes
   * @param {UUID} user_id Creator of the attributes
   */
  async create(attributes, brand_id, user_id) {
    if (!attributes || attributes.length < 1) return { attribute_ids: [], affected_contact_ids: [] }

    const defs_by_id = await loadUserAttributeDefs(brand_id)
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
      'is_partner',
      'index'
    ]

    attributes = attributes
      .filter(attr => attr.text !== '')
      .map(attr =>
        _.pick(
          attr,
          'created_by',
          'contact',
          'attribute_def',
          'attribute_type',
          'text',
          'date',
          'number',
          'label',
          'is_primary',
          'is_partner',
          'index'
        )
      )

    this.normalizeAttributes(attributes, defs_by_id)
    ensureFieldsOnAttributes(attributes, fields)

    const LIBPQ_PARAMETER_LIMIT = 0xffff

    try {
      const chunks = await Promise.all(
        _(attributes)
          .chunk(Math.floor(LIBPQ_PARAMETER_LIMIT / fields.length))
          .map((chunk, i) => {
            const q = squel
              .insert()
              .into('contacts_attributes')
              .setFieldsRows(chunk)
              .returning('id')

            // @ts-ignore
            q.name = 'contact/attribute/create#' + i
            return db.selectIds(q)
          })
          .value()
      )

      const attribute_ids = chunks.flat()

      const affected_contact_ids = _.uniq(attributes.map(a => a.contact))
      await set_updated_at_for_contacts(
        Array.from(affected_contact_ids),
        user_id
      )

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
   */
  async delete(attribute_ids, user_id) {
    const affected_contacts = await db.map('contact/attribute/delete', [
      attribute_ids,
      user_id
    ], 'contact')
    await db.update('contact/set_updated_at', [affected_contacts, user_id])

    this.emit('delete', { attribute_ids, affected_contacts, user_id })

    return affected_contacts
  }

  /**
   * Deletes an attribute by id for a contact
   * @param {UUID} contact_id
   * @param {UUID} attribute_id
   */
  async deleteForContact(contact_id, attribute_id, user_id) {
    const attr = await this.get(attribute_id)
    if (!attr || attr.contact !== contact_id) return 0

    await this.delete([attr.id], user_id)
    return 1
  }

  /**
   * Updates a number of a contact's attributes
   * @param {IContactAttributeInputWithContact[]} attributes
   * @returns {Promise<Set<UUID>>}
   */
  async update(attributes, user_id) {
    if (!Array.isArray(attributes) || attributes.length < 1) return new Set()

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
    const contact_attrs = await this.getForContacts(Array.from(contact_ids))
    const attrs_by_id = _.keyBy(contact_attrs, 'id')

    const merged_attributes = attributes
      .filter(
        /** @type {TIsRequirePropPresent<IContactAttributeInputWithContact, 'id'>} */ (attr =>
          attr.hasOwnProperty('id'))
      )
      .filter(attr => attrs_by_id[attr.id])
      .map(attr => {
        return Object.assign(
          attrs_by_id[attr.id],
          _.pick(
            attr,
            'id',
            'text',
            'date',
            'number',
            'label',
            'is_primary',
            'index'
          )
        )
      })

    const def_ids = new Set(merged_attributes.map(attr => attr.attribute_def))
    const defs = await AttributeDef.getAll(Array.from(def_ids))
    const defs_by_id = _.keyBy(defs, 'id')

    this.normalizeAttributes(merged_attributes, defs_by_id)
    const final_attributes = merged_attributes.map(attr =>
      _.pick(
        attr,
        'id',
        'text',
        'date',
        'number',
        'label',
        'is_primary',
        'index'
      )
    )
    ensureFieldsOnAttributes(final_attributes, update_fields)

    const LIBPQ_PARAMETER_LIMIT = 0xffff

    try {
      await Promise.all(
        _(final_attributes)
          .chunk(Math.floor(LIBPQ_PARAMETER_LIMIT / update_fields.length))
          .map((chunk, i) => {
            const q = squel
              .update()
              .withValues('update_values', chunk)
              .table('contacts_attributes', 'ca')
              .set('text = uv.text')
              .set('date = uv.date::timestamptz')
              .set('number = uv.number::float')
              .set('index = uv.index::int2')
              .set('label = uv.label')
              .set('is_primary = uv.is_primary::boolean')
              .set('updated_at = now()')
              .set('updated_by = ?', user_id)
              .from('update_values', 'uv')
              .where('ca.id = (uv.id)::uuid')
              .returning('ca.id')

            q.name = 'contact/attribute/update#' + i

            return db.selectIds(q)
          })
          .value()
      )

      await set_updated_at_for_contacts(Array.from(contact_ids), user_id)

      return contact_ids
    } catch (ex) {
      if (ex.constraint === 'unique_index_for_contact_attribute_cst') {
        throw Error.BadRequest(ex.details)
      } else {
        throw ex
      }
    }
  }
}

ContactAttribute.prototype.associations = {
  attribute_def: {
    model: 'ContactAttributeDef',
    enabled: false
  }
}

module.exports = new ContactAttribute()

Orm.register('contact_attribute', 'ContactAttribute', module.exports)
