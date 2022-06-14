const _ = require('lodash')
const squel = require('../../utils/squel_extensions')
const promisify = require('../../utils/promisify.js')
const db = require('../../utils/db.js')
const Activity = require('../Activity/add')
const Context = require('../Context')

const ContactAttribute = require('./attribute/manipulate')

/**
 * @param {IContactInput[]} contacts 
 * @param {UUID} user_id 
 * @param {UUID} brand_id 
 * @param {TContactActionReason} _reason
 */
async function createContacts(contacts, user_id, brand_id, _reason = 'direct_request') {
  if (!contacts || contacts.length < 1) return[]

  const data = []

  for (let i = 0; i < contacts.length; i++) {
    data[i] = {
      brand: brand_id,
      created_by: user_id,
      user: contacts[i].user,
      ios_address_book_id: contacts[i].ios_address_book_id || null,
      android_address_book_id: contacts[i].android_address_book_id || null,
      created_within: Context.getId(),
      created_for: _reason,
      parked: contacts[i].parked || false,
      touch_freq: contacts[i].touch_freq ?? null,
    }
  }

  const LIBPQ_PARAMETER_LIMIT = 0xFFFF

  const result = await Promise.all(_(data)
    .chunk(Math.floor(LIBPQ_PARAMETER_LIMIT / Object.keys(data[0]).length))
    .map((chunk, i) => {
      const q = squel
        .insert({ autoQuoteFieldNames: true, nameQuoteCharacter: '"' })
        .into('contacts')
        .setFieldsRows(chunk)
        .returning('id')

      // @ts-ignore
      q.name = 'contact/create#' + i
      return db.selectIds(q)
    })
    .value())

  return _.flatten(result)
}

/**
 * 
 * @param {UUID[]} contact_ids 
 * @param {IContactInput[]} contacts 
 * @param {UUID} user_id 
 * @param {UUID} brand_id 
 * @param {TContactActionReason} _reason
 */
function createContactAttributes(
  contact_ids,
  contacts,
  user_id,
  brand_id,
  _reason
) {
  /** @type {IContactAttributeInputWithContact[]} */
  let attributes = []

  for (let i = 0; i < contacts.length; i++) {
    if (Array.isArray(contacts[i].attributes)) {
      attributes = attributes.concat(
        contacts[i].attributes.map(attr => ({
          ...attr,
          contact: contact_ids[i],
          created_by: user_id,
          created_within: Context.getId()
        }))
      )
    }
  }

  return ContactAttribute.create(attributes, user_id, brand_id, _reason)
}

async function createActivityForContacts(contact_ids) {
  for (const id of contact_ids) {
    const activity = {
      action: 'UserCreatedContact',
      object: id,
      object_class: 'contact'
    }

    await promisify(Activity.add)(id, 'Contact', activity)
  }
}

module.exports = {
  createContacts,
  createContactAttributes,
  createActivityForContacts
}
