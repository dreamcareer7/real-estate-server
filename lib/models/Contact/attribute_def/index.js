const _ = require('lodash')

const validator = require('../../../utils/validator.js')

const db = require('../../../utils/db.js')
const Summary = require('../summary')

const emitter = require('./emitter')

const schema = require('../schemas').contact_attribute_def
const expect = validator.expect

const validate = validator.promise.bind(null, schema)

/**
 * Performs access control for the brand on a number of ids
 * @param {UUID} brand_id Brand id requesting access
 * @param {TAccessActions} op Action the user is trying to perform
 * @param {UUID[]} ids AttributeDef ids to perform access control
 * @returns {Promise<Map<UUID, boolean>>}
 */
async function hasAccess(brand_id, op, ids) {
  expect(ids).to.be.an('array')

  const access = op === 'read' ? 'read' : 'write'
  const rows = await db.select('contact/attribute_def/has_access', [
    Array.from(new Set(ids)),
    brand_id
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
 * Creates a ContactAttributeDef instance
 * @param {UUID} user_id Creator of the attribute
 * @param {UUID} brand_id Owner of the attribute
 * @param {IContactAttributeDefInput} attribute_def AttributeDef object
 * @returns {Promise<UUID>}
 */
async function create(user_id, brand_id, attribute_def) {
  return await db.insert('contact/attribute_def/create', [
    user_id,
    brand_id,
    attribute_def.name,
    attribute_def.data_type,
    attribute_def.label,
    attribute_def.section,
    attribute_def.required,
    attribute_def.singular,
    attribute_def.searchable || false,
    attribute_def.has_label || false,
    attribute_def.labels || null,
    attribute_def.enum_values || null
  ])
}

/**
 * Updates an AttributeDef by id
 * @param {UUID} id AttributeDef id
 * @param {IContactAttributeDefInput} def The whole AttributeDef object
 * @param {UUID} user_id
 */
async function update(id, def, user_id) {
  const d = (key, default_value) => (def !== undefined && def !== null) ? def[key] : default_value

  return db.update('contact/attribute_def/update', [
    id,
    def.label,
    def.section,
    d('required', false),
    d('singular', true),
    d('searchable', false),
    d('has_label', false),
    d('labels', null),
    d('enum_values', null),
    user_id
  ])
}

/**
 * Deletes an attribute_def by id and returns ids of affected contacts
 * @param {UUID} id attribute_def id
 * @param {UUID} user_id
 */
async function deleteAttributeDef(id, user_id) {
  /** @type {UUID[]} */
  const affected_contacts = await db.selectIds('contact/attribute_def/delete', [
    id,
    user_id
  ])

  await Summary.update(_.uniq(affected_contacts))

  emitter.emit('delete', {
    id,
    affected_contacts: _.uniq(affected_contacts)
  })

  return affected_contacts
}

module.exports = {
  validate,
  hasAccess,
  create,
  update,
  delete: deleteAttributeDef,

  ...require('./get'),
  on: emitter.on.bind(emitter),
  once: emitter.once.bind(emitter),
}
