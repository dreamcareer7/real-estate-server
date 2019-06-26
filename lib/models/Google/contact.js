const db    = require('../../utils/db.js')
const Orm   = require('../Orm')
const squel = require('../../utils/squel_extensions')


const GoogleContact = {}



GoogleContact.getAll = async (entry_id, google_credential) => {
  const contacts = await db.select('google/contact/get', [entry_id, google_credential])

  return contacts
}

GoogleContact.get = async (entry_id, google_credential) => {
  const contacts = await GoogleContact.getAll([entry_id], google_credential)

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
      .onConflict(['google_credential', 'entry_id'], {
        entry: squel.rstr('EXCLUDED.entry'),
        updated_at: squel.rstr('now()')
      })
      .returning('google_contacts.id, google_contacts.google_credential, google_contacts.entry_id, google_contacts.entry')

    q.name = 'google/contact/bulk_upsert'

    return db.select(q)
  })  
}

GoogleContact.getRefinedContactGroups = async (credentialId) => {
  const contactGroups = await db.select('google/contact_group/get_by_credential', [credentialId])

  if ( contactGroups.length > 0 ) {

    const refined = {}

    contactGroups.map(cg => {
      let key = cg.entry_id
      let val = cg.entry['title']['$t']

      if (cg.entry['gContact$systemGroup']) {
        if (cg.entry['gContact$systemGroup']['id'])
          val = cg.entry['gContact$systemGroup']['id']
      }

      refined[key] = val
    })

    return refined
  }

  return null
}


Orm.register('google_contact', 'GoogleContact', GoogleContact)

module.exports = GoogleContact