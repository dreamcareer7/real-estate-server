const db     = require('../../utils/db.js')
const Orm    = require('../Orm')
const format = require('pg-format');

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

GoogleContact.bulkInsert = async (values) => {
  let result, sqlStructure, builtQuery

  try {
    sqlStructure = await db.getQuery('google/contact/bulk_insert')
    builtQuery   = format(sqlStructure, values)
    result       = await db.executeSql.promise(builtQuery)
  } catch(ex) {
    throw Error.Conflict({ details: ex.detail, info: { method: 'GoogleContact.bulkInsert', message: ex.message, query: builtQuery }})
  }

  return result.rows
}

GoogleContact.softDelete = async (resource_name) => {
  return db.update('google/contact/soft_delete', [ resource_name, new Date() ])
}



Orm.register('googleContact', 'GoogleContact', GoogleContact)

module.exports = GoogleContact