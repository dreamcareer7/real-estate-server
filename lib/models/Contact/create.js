const _ = require('lodash')
const squel = require('../../utils/squel_extensions')
const promisify = require('../../utils/promisify.js')
const db = require('../../utils/db.js')
const Activity = require('../Activity')
const ContactAttribute = require('./attribute')

/**
 * 
 * @param {IContactInput[]} contacts 
 * @param {UUID} user_id 
 * @param {UUID} brand_id 
 */
async function createContacts(contacts, user_id, brand_id) {
  if (!contacts || contacts.length < 1) return[]

  const data = []

  for (let i = 0; i < contacts.length; i++) {
    data[i] = {
      brand: brand_id,
      created_by: user_id,
      user: contacts[i].user,
      ios_address_book_id: contacts[i].ios_address_book_id || null,
      android_address_book_id: contacts[i].android_address_book_id || null
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
 * @param {UUID} user_id 
 * @param {UUID} brand_id 
 * @param {UUID[]} contact_ids 
 * @param {IContactInput[]} contacts 
 */
function createContactAttributes(
  user_id,
  brand_id,
  contact_ids,
  contacts
) {
  let attributes = []

  for (let i = 0; i < contacts.length; i++) {
    if (Array.isArray(contacts[i].attributes)) {
      attributes = attributes.concat(
        contacts[i].attributes.map(attr => ({
          ...attr,
          contact: contact_ids[i],
          created_by: user_id
        }))
      )
    }
  }

  return ContactAttribute.create(attributes, brand_id, user_id)
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
