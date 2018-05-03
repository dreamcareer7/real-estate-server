const _ = require('lodash')
const { EventEmitter } = require('events')

const validator = require('../../utils/validator.js')

const db = require('../../utils/db.js')
const Orm = require('../Orm')

const schema = require('./schemas').contact_attribute_def
const expect = validator.expect
const validate = validator.promise.bind(null, schema)
const emitter = new EventEmitter

class ContactAttributeDef {
  static async validate(attribute, defs_by_id) {
    await validate(attribute)
  }

  /**
   * Performs access control for the user on a number of ids
   * @param {UUID} user_id User id requesting access
   * @param {TAccessActions} op Action the user is trying to perform
   * @param {UUID[]} ids AttributeDef ids to perform access control
   * @returns {Promise<Map<UUID, boolean>>}
   */
  static async hasAccess(user_id, op, ids) {
    expect(ids).to.be.an('array')

    const access = op === 'read' ? 'read' : 'write'
    const rows = await db.select('contact/attribute_def/has_access', [
      Array.from(new Set(ids)),
      user_id
    ])

    const foundIndex = _.keyBy(rows, 'id')

    const accessIndex = ids.reduce((index, tid) => {
      return index.set(
        tid,
        foundIndex.hasOwnProperty(tid) && foundIndex[tid][access]
      )
    }, new Map())

    return accessIndex
  }

  /**
   * Gets attribute defs given their ids. No questions asked.
   * @param {UUID[]} ids 
   * @returns {Promise<IContactAttributeDef[]>}
   */
  static async getAll(ids) {
    return await db.select('contact/attribute_def/get', [
      ids
    ])
  }

  /**
   * Get all global and custom attributes accessible to the user
   * @param {UUID} user_id User id requesting attributes
   * @returns {Promise<UUID[]>}
   */
  static getForUser(user_id) {
    return db.selectIds('contact/attribute_def/for_user', [
      user_id
    ])
  }

  /**
   * Get all global attributes accessible to everyone
   * @returns {Promise<UUID[]>}
   */
  static getGlobalDefs() {
    return db.selectIds('contact/attribute_def/globals', [])
  }

  /**
   * Creates a ContactAttributeDef instance
   * @param {UUID} user_id Owner of the attribute
   * @param {IContactAttributeDefInput} attribute_def AttributeDef object
   * @returns {Promise<UUID>}
   */
  static async create(user_id, attribute_def) {
    return await db.insert('contact/attribute_def/create', [
      user_id,
      attribute_def.data_type,
      attribute_def.name,
      attribute_def.label,
      attribute_def.section,
      attribute_def.required || false,
      attribute_def.singular || true,
      attribute_def.searchable || false,
      attribute_def.has_label || false,
      attribute_def.labels || null,
      attribute_def.enum_values || null
    ])
  }

  /**
   * Updates an AttributeDef by id
   * @param {UUID} id AttributeDef id
   * @param {IContactAttributeDefInput} attribute_def The whole AttributeDef object
   */
  static async update(id, attribute_def) {
    return db.update('contact/attribute_def/update', [
      id,
      attribute_def.label,
      attribute_def.section,
      attribute_def.required || false,
      attribute_def.singular || true,
      attribute_def.searchable || false,
      attribute_def.has_label || false,
      attribute_def.labels || null,
      attribute_def.enum_values || null
    ])
  }

  /**
   * Deletes an attribute_def by id and returns ids of affected contacts
   * @param {UUID} id attribute_def id
   */
  static async delete(id) {
    /** @type {Record<'id' | 'contact', UUID>[]} */
    const rows = await db.select('contact/attribute_def/update', [
      id
    ])

    return new Set(rows.map(r => r.contact))
  }
}

ContactAttributeDef.on = emitter.on.bind(emitter)

Orm.register('contact_attribute_def', 'ContactAttributeDef', ContactAttributeDef)

module.exports = ContactAttributeDef
