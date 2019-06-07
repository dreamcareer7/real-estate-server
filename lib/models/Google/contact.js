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

  // if (contacts.length < 1)
  //   throw Error.ResourceNotFound(`Google-Contact ${id} not found`)

  if (contacts.length < 1)
    return null

  // (id)contact_group_resource_name: memberships.contactGroupMembership.contactGroupResourceName
  return contacts[0]
}

GoogleContact.create = async (records) => {
  return await db.chunked(records, 3, (chunk, i) => {
    const q = squel
      .insert()
      .into('google_contacts')
      .setFieldsRows(chunk)
      .onConflict(['id'], {
        meta: squel.rstr('EXCLUDED.meta')
      })
      .returning('id')

    q.name = 'google/contact/bulk_upsert'

    return db.selectIds(q)
  })  
}

GoogleContact.delete = async (id) => {
  return db.update('google/contact/delete', [ id, new Date() ])
}

GoogleContact.getRefinedContactGroups = async (credentialId) => {
  const contactGroups = await db.select('google/contact_group/get_by_credential', [credentialId])

  if ( contactGroups.length > 0 ) {

    const refined = {}

    contactGroups.map(cg => {
      const key  = cg.id
      const val  = cg.meta.formattedName

      refined[key]  = val
    })

    return refined
  }

  return null
}


Orm.register('google_contact', 'GoogleContact', GoogleContact)

module.exports = GoogleContact