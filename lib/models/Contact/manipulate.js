const _ = require('lodash')
const { expect } = require('../../utils/validator')

const sq = require('../../utils/squel_extensions')
const db = require('../../utils/db.js')

const Context = require('../Context')

const { validate, validateTouchFreq } = require('./validate')

const { fastFilter } = require('./fast_filter')
const emitter = require('./emitter')
const ContactAttribute = {
  ...require('./attribute/manipulate'),
  ...require('./attribute/tag'),
}
const {
  createContacts,
  createContactAttributes,
  createActivityForContacts
} = require('./create')


/**
 * Create multiple contacts in bulk with performance in mind
 * @param {IContactInput[]} contacts Array of contacts data
 * @param {UUID} user_id Creator of the contacts
 * @param {UUID} brand_id Owner of the contacts
 * @param {TContactActionReason} _reason
 * @param {IAddContactOptions} options Options to tune the behavior for performance
 * @returns {Promise<UUID[]>}
 */
async function create(contacts, user_id, brand_id, _reason = 'direct_request', options = {}) {
  options = Object.assign(
    {
      activity: true,
      get: true,
      relax: false
    },
    options
  )

  await validate(contacts)
  const contact_ids = await createContacts(contacts, user_id, brand_id, _reason)
  await createContactAttributes(contact_ids, contacts, user_id, brand_id, _reason)

  if (options.activity !== false) {
    await createActivityForContacts(contact_ids)
  }

  await updateSummary(contact_ids)

  emitter.emit('create', {
    user_id,
    brand_id,
    contact_ids
  })

  return contact_ids
}

/**
 * @param {UUID | undefined} brand_id User id requesting filter
 * @param {IContactAttributeFilter[]} attribute_filters
 * @param {IContactFilterOptions & PaginationOptions | undefined} options
 */
async function undelete(brand_id, attribute_filters = [], options = {}) {
  const { ids } = await fastFilter(brand_id, attribute_filters, options)

  const result = await db.update('contact/undelete', [
    ids,
  ])

  await updateSummary(ids)

  emitter.emit('create', {
    contact_ids: ids,
    event_type: 'undelete'
  })

  return result
}

/**
 * @param {UUID[]} ids 
 * @param {UUID} user_id 
 * @param {TContactActionReason} _reason
 */
async function deleteContacts(ids, user_id, _reason = 'direct_request') {
  const result = await db.update('contact/delete', [
    ids,
    user_id,
    Context.getId(),
    _reason
  ])

  emitter.emit('delete', {
    user_id,
    contact_ids: ids,
    event_type: 'delete',
    reason: _reason
  })

  return result
}



/**
 * @param {UUID} contact_id 
 * @param {IContactAttributeInput[]} attributes 
 * @param {UUID} user_id 
 * @param {UUID} brand_id 
 * @param {TContactActionReason} _reason
 */
async function addAttributes(contact_id, attributes, user_id, brand_id, _reason = 'direct_request') {
  if (!Array.isArray(attributes) || attributes.length < 1) return []

  const { affected_contact_ids, attribute_ids } = await ContactAttribute.create(attributes.map(attr => ({
    ...attr,
    contact: contact_id,
    created_by: user_id
  })), user_id, brand_id, _reason)

  await updateSummary(affected_contact_ids)

  emitter.emit('update', {
    user_id,
    brand_id,
    contact_ids: affected_contact_ids,
    event_type: 'update',
    reason: _reason
  })

  return attribute_ids
}

/**
 * Updates a contact with attributes
 * @param {Partial<IContactInput>[]} contacts
 * @param {UUID} user_id
 * @param {UUID} brand_id
 * @param {TContactActionReason} _reason
 * @returns {Promise<UUID[]>}
 */
async function update(contacts, user_id, brand_id, _reason = 'direct_request') {
  if (!Array.isArray(contacts) || contacts.length < 1) return []

  await validate(contacts)

  /** @type {IContactAttributeInputWithContact[]} */
  const toAdd = [],
    toUpdate = []

  /** @type {RequireProp<Partial<IContactInput>, 'id'>[]} */
  const toChangeContacts = []

  for (const contact of contacts) {
    if (contact.id && (
      contact.hasOwnProperty('ios_address_book_id') ||
      contact.hasOwnProperty('user') ||
      contact.hasOwnProperty('parked')
    )) {
      toChangeContacts.push({
        id: contact.id,
        user: contact.user,
        ios_address_book_id: contact.ios_address_book_id,
        parked: contact.parked,
      })
    }

    if (contact.id && Array.isArray(contact.attributes)) {
      for (const attr of contact.attributes) {
        if (attr.id) {
          toUpdate.push({
            ...attr,
            contact: contact.id
          })
        } else {
          toAdd.push({
            ...attr,
            contact: contact.id,
            created_by: user_id
          })
        }
      }
    }
  }

  const { affected_contact_ids: affected_add } = await ContactAttribute.create(toAdd, user_id, brand_id, _reason)
  const affected_update = await ContactAttribute.update(toUpdate, user_id, _reason)

  if (toChangeContacts.length > 0) {
    const q = sq
      .update({
        autoQuoteFieldNames: true,
        nameQuoteCharacter: '"'
      })
      .withValues('update_values', toChangeContacts)
      .table('contacts')
      .set('ios_address_book_id', sq.rstr('COALESCE(uv.ios_address_book_id, contacts.ios_address_book_id)'))
      .set('user', sq.rstr('COALESCE(uv.user::uuid, contacts.user)'))
      .set('parked', sq.rstr('COALESCE(uv.parked::bool, contacts.parked)'))
      .set('updated_at', sq.rstr('now()'))
      .set('updated_by', user_id)
      .set('updated_within', Context.getId())
      .from('update_values', 'uv')
      .where('contacts.id = uv.id::uuid')
      .returning('contacts.id')
    
    // @ts-ignore
    q.name = 'contact/update'

    await db.selectIds(q)
  }

  const affected_contacts = _.uniq(Array.from(affected_add)
    .concat(Array.from(affected_update))
    .concat(toChangeContacts.map(c => c.id)))

  await updateSummary(affected_contacts)

  emitter.emit('update', {
    user_id,
    brand_id,
    contact_ids: affected_contacts,
    event_type: 'update',
    reason: _reason
  })

  return affected_contacts
}

/**
 * Add new tags to contacts if they don't have that tag,
 * and delete tags when they're common in all contacts.
 * 
 * @param {UUID[]} ids 
 * @param {string[]} newTags 
 * @param {UUID} user 
 * @param {UUID} brand 
 * @param {boolean} shouldDelete
 */
async function updateTags(ids, newTags, user, brand, shouldDelete) {
  await ContactAttribute.updateTags(ids, newTags, user, brand, shouldDelete)
  await updateSummary(ids)
}

/**
 * @param {Pick<IContact, 'id' | 'touch_freq'>[]} contacts
 * @param {IUser['id']} userId
 * @param {IBrand['id']} brandId
 * @returns {Promise<IContact['id'][]>}
 */
async function updateTouchFreq (contacts, userId, brandId) {
  if (!contacts?.length) { return [] }
  
  for (const { id, touch_freq } of contacts) {
    expect(id, 'id must be uuid').to.be.uuid
    validateTouchFreq(touch_freq)
  }

  const q = sq.update({ autoQuoteFieldNames: true, nameQuoteCharacter: '"' })
    .withValues('update_values', contacts)
    .table('contacts')
    .set('touch_freq', sq.rstr('uv.touch_freq::int'))
    .set('updated_within', Context.getId())
    .set('updated_at', sq.rstr('now()'))
    .set('updated_by', userId)
    .from('update_values', 'uv')
    .where('contacts.id = uv.id::uuid')
    .returning('contacts.id')
  
  Object.assign(q, { name: 'contact/update_touch_freq' })
  const ids = await db.selectIds(q)
  if (!ids.length) { return [] }

  emitter.emit('update:touch_freq', {
    contact_ids: ids,
    brand_id: brandId,
    user_id: userId,
  })
  
  return ids
}

/**
 * @param {UUID[]} contact_ids 
 */
async function updateSummary(contact_ids) {
  if (contact_ids.length === 0) return 0

  return db.update('contact/update_summary', [
    contact_ids
  ])
}

/**
 * Merges a number of contacts into a parent contact
 * @param {UUID[]} contact_ids 
 * @param {UUID} parent_id 
 * @param {UUID} user_id 
 * @param {UUID} brand_id 
 */
async function merge(contact_ids, parent_id, user_id, brand_id) {
  if (!Array.isArray(contact_ids) || contact_ids.length < 1) return []

  const deleted_contacts = await db.selectIds('contact/merge', [
    parent_id,
    contact_ids,
    user_id,
    Context.getId()
  ])

  await updateSummary([parent_id])

  emitter.emit('update', {
    user_id,
    brand_id,
    contact_ids: [parent_id],
    event_type: 'merge'
  })

  emitter.emit('delete', {
    user_id,
    brand_id,
    contact_ids: deleted_contacts,
    event_type: 'merge'
  })

  return deleted_contacts
}

module.exports = {
  create,
  update,
  updateTags,
  addAttributes,
  undelete,
  delete: deleteContacts,
  merge,
  updateSummary,
  updateTouchFreq,
}
