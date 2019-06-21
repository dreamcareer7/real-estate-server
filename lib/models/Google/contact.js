const db    = require('../../utils/db.js')
const Orm   = require('../Orm')
const squel = require('../../utils/squel_extensions')


const GoogleContact = {}



GoogleContact.getAll = async (resource_names, google_credential) => {
  const contacts = await db.select('google/contact/get', [resource_names, google_credential])

  return contacts
}

GoogleContact.get = async (resource_name, google_credential) => {
  const contacts = await GoogleContact.getAll([resource_name], google_credential)

  if (contacts.length < 1)
    return null

  return contacts[0]
}

GoogleContact.create = async (records) => {
  return await db.chunked(records, 3, (chunk, i) => {
    const q = squel
      .insert()
      .into('google_contacts')
      .setFieldsRows(chunk)
      .onConflict(['google_credential', 'resource_name'], {
        meta: squel.rstr('EXCLUDED.meta'),
        updated_at: squel.rstr('now()')
      })
      .returning('google_contacts.id, google_contacts.google_credential, google_contacts.resource_name, google_contacts.meta')

    q.name = 'google/contact/bulk_upsert'

    return db.select(q)
  })  
}

GoogleContact.getRefinedContactGroups = async (credentialId) => {
  const contactGroups = await db.select('google/contact_group/get_by_credential', [credentialId])

  if ( contactGroups.length > 0 ) {

    const refined = {}

    contactGroups.map(cg => {
      const key  = cg.resource_name
      const val  = cg.meta.formattedName

      refined[key]  = val
    })

    return refined
  }

  return null
}


Orm.register('google_contact', 'GoogleContact', GoogleContact)

module.exports = GoogleContact