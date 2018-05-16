const squel = require('../../utils/squel_extensions')
const promisify = require('../../utils/promisify.js')
const db = require('../../utils/db.js')

const Activity = require('../Activity')
const ContactAttribute = require('./attribute')

async function createContacts(user_id, contacts) {
  const data = []

  for (let i = 0; i < contacts.length; i++) {
    data[i] = {
      user: user_id,
      created_by: user_id,
      ios_address_book_id: contacts[i].ios_address_book_id || null,
      android_address_book_id: contacts[i].android_address_book_id || null
    }
  }

  const q = squel
    .insert({ autoQuoteFieldNames: true, nameQuoteCharacter: '"' })
    .into('contacts')
    .setFieldsRows(data)
    .returning('id')

  q.name = 'contact/create'

  return db.selectIds(q)
}

function createContactAttributes(
  user_id,
  contact_ids,
  contacts,
  relax = false
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

  return ContactAttribute.create(attributes, relax)
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
