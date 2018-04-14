const _ = require('lodash')

const squel = require('../../utils/squel_extensions')
const validator = require('../../utils/validator.js')
const belt = require('../../utils/belt')
const db = require('../../utils/db')
const { asyncMap } = require('../../utils/belt')
const ObjectUtil = require('../ObjectUtil')

const Orm = require('../Orm')
const AttributeDef = require('./attribute_def')

const schema = require('./schemas').contact_attribute
const expect = validator.expect
const validate = validator.promise.bind(null, schema)

const formatters = {
  email: function(attr) {
    return {
      ...attr,
      text: attr.text ? attr.text.toLowerCase() : attr.text
    }
  },
  phone_number: function(attr) {
    const phone_number = ObjectUtil.cleanPhoneNumber(attr.text)
    return {
      ...attr,
      text: ObjectUtil.formatPhoneNumberForDialing(phone_number)
    }
  }
}

class InvalidPhoneException extends Error {}

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
 * @param {boolean} relax
 */
async function normalizeAttributes(attributes, defs_by_id, relax = false) {
  return asyncMap(attributes, /** @param {IContactAttributeInput} attr */ async attr => {
    const def = defs_by_id[attr.attribute_def]

    try {
      await ContactAttribute.validate(attr, defs_by_id)

      const formatter = formatters[def.name]
      if (formatter) {
        attr = formatter(attr)
      }
    } catch (ex) {
      if (!(relax && ex instanceof InvalidPhoneException)) {
        console.error(ex)
        throw Error.Validation(ex.message)
      }
    }

    switch (def.data_type) {
      case 'date':
        attr.date = belt.epochToDate(attr.date).toISOString()
        break
      default:
        break
    }

    return attr
  })
}

class ContactAttribute {
  static async validate(attribute, defs_by_id) {
    await validate(attribute)

    if (defs_by_id) {
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

      if (def.name === 'phone_number') {
        try {
          ObjectUtil.formatPhoneNumberForDialing(
            ObjectUtil.cleanPhoneNumber(attribute.text)
          )
          expect(attribute.text).to.be.phone
        } catch (ex) {
          throw new InvalidPhoneException(
            `Phone number ${attribute.text} is not valid.`
          )
        }
      }
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

    let q
    for (const filter of attribute_filters) {
      const def = defs_by_id[filter.attribute_def]

      const sub_q = squel.select()
        .field('contact')
        .distinct()
        .from('contacts_attributes')

      if (def) {
        const value = filter[def.data_type]

        sub_q
          .where('deleted_at IS NULL')
          .where('attribute_def = ?', filter.attribute_def)

        switch (def.data_type) {
          case 'date':
            sub_q.where(`${def.data_type} = to_timestamp(?)`, value)
            break
          default:
            sub_q.where(`${def.data_type} = ?`, value)
        }
      }
      else {
        sub_q.where('False')
      }

      if (q)
        q = q.union(sub_q, 'INTERSECT')
      else
        q = sub_q
    }

    return q
  }

  /**
   * Create multiple attributes
   * @param {IContactAttribute[]} attributes
   * @param {boolean} relax Option to relax validations and add as much as possible
   * @returns {Promise<UUID[]>}
   */
  static async create(attributes, relax = false) {
    if (!attributes || attributes.length < 1) return []

    const user_id = attributes[0].created_by
    const defs_by_id = await loadUserAttributeDefs(user_id, attributes.map(attr => attr.attribute_def))
    const fields = [
      'created_by',
      'contact',
      'attribute_def',
      'text',
      'date',
      'number',
      'label',
      'is_primary',
      'index'
    ]

    attributes = attributes.map(attr => _.pick(attr, fields))
    const attrsArray = await normalizeAttributes(attributes, defs_by_id, relax)
    ensureFieldsOnAttributes(attrsArray, fields)

    const q = squel
      .insert()
      .into('contacts_attributes')
      .setFieldsRows(attrsArray)
      .returning('id')
    
    q.name = 'contact/attribute/create'

    return db.selectIds(q)
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

    const ids = await ContactAttribute.create(attributes)
    return ContactAttribute.getAll(ids)
  }

  /**
   * Deletes an attribute by id for a contact
   * @param {UUID} contact_id 
   * @param {UUID} attribute_id 
   */
  static delete(contact_id, attribute_id) {
    return db.update('contact/attribute/delete', [contact_id, attribute_id])
  }

  /**
   * Updates a number of a contact's attributes
   * @param {IContactAttribute[]} attributes
   */
  static async update(attributes, relax = false) {
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

    const contact_ids = attributes.map(attr => attr.contact)
    const contact_attrs = await ContactAttribute.getForContacts(contact_ids)
    const attrs_by_id = _.keyBy(contact_attrs, 'id')

    attributes = attributes
      .map(attr => {
        if (!attrs_by_id[attr.id]) return
        return Object.assign(attrs_by_id[attr.id], _.pick(attr, update_fields))
      })
      .filter(x => x)

    const def_ids = Array.from(
      new Set(attributes.map(attr => attr.attribute_def))
    )
    const defs = await AttributeDef.getAll(def_ids)
    const defs_by_id = _.keyBy(defs, 'id')

    let attrsArray = await normalizeAttributes(attributes, defs_by_id, relax)
    attrsArray = attrsArray.map(attr => _.pick(attr, update_fields))
    ensureFieldsOnAttributes(attrsArray, update_fields)

    const q = squel
      .update()
      .withValues('update_values', attrsArray)
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

    q.name = 'contact/attribute/update'

    return db.selectIds(q)
  }
}

Orm.register('contact_attribute', 'ContactAttribute', ContactAttribute)

module.exports = ContactAttribute
