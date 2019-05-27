const db    = require('../../utils/db.js')
const Orm   = require('../Orm')
const squel = require('../../utils/squel_extensions')


const GoogleContact = {}



GoogleContact.getAll = async (ids) => {
  const contacts = await db.select('google/contact/get', [ids])

  return contacts
}

GoogleContact.get = async (id) => {
  const contacts = await GoogleContact.getAll([id])

  if (contacts.length < 1)
    throw Error.ResourceNotFound(`Google-Contact ${id} not found`)

  // contact_group_resource_name: memberships.contactGroupMembership.contactGroupResourceName
  return contacts[0]
}

GoogleContact.getByResourceName = async (resource_name) => {
  const ids = await db.selectIds('google/contact/get_by_resource_name', [resource_name])

  if (ids.length < 1)
    return null

  return GoogleContact.get(ids[0])
}

GoogleContact.create = async (google_credential, meta) => {
  return db.insert('google/contact/insert',[
    google_credential,
    meta.resourceName,
    meta
  ])
}

GoogleContact.bulkInsert = async (records) => {
  return await db.chunked(records, 3, (chunk, i) => {
    const q = squel
      .insert()
      .into('google_contacts')
      .setFieldsRows(chunk)
      .onConflict(['resource_name'], {
        meta: squel.rstr('EXCLUDED.meta')
      })
      .returning('id')

    q.name = 'google/contact/bulk_upsert'

    return db.selectIds(q)
  })  
}

GoogleContact.delete = async (resource_name) => {
  return db.update('google/contact/soft_delete', [ resource_name, new Date() ])
}



Orm.register('googleContact', 'GoogleContact', GoogleContact)

module.exports = GoogleContact