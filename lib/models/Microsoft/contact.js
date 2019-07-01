const db    = require('../../utils/db.js')
const Orm   = require('../Orm')
const squel = require('../../utils/squel_extensions')


const MicrosoftContact = {}



MicrosoftContact.getAll = async (remote_id, microsoft_credential) => {
  const contacts = await db.select('microsoft/contact/get', [remote_id, microsoft_credential])

  return contacts
}

MicrosoftContact.get = async (remote_id, microsoft_credential) => {
  const contacts = await MicrosoftContact.getAll([remote_id], microsoft_credential)

  if (contacts.length < 1)
    return null

  return contacts[0]
}

MicrosoftContact.getGCredentialContactsNum = async (microsoft_credential) => {
  return await db.select('microsoft/contact/count', [microsoft_credential])
}

MicrosoftContact.create = async (records) => {
  return await db.chunked(records, 3, (chunk, i) => {
    const q = squel
      .insert()
      .into('microsoft_contacts')
      .setFieldsRows(chunk)
      .onConflict(['microsoft_credential', 'remote_id'], {
        data: squel.rstr('EXCLUDED.data'),
        updated_at: squel.rstr('now()')
      })
      .returning('microsoft_contacts.id, microsoft_contacts.microsoft_credential, microsoft_contacts.remote_id, microsoft_contacts.data')

    q.name = 'microsoft/contact/bulk_upsert'

    return db.select(q)
  })  
}

MicrosoftContact.getRefinedContactFolders = async (credentialId) => {
  const contactFolders = await db.select('microsoft/contact_folder/get_by_credential', [credentialId])

  if ( contactFolders.length > 0 ) {

    const refined = {}

    contactFolders.map(cf => {
      refined[cf.folder_id] = cf.display_ame
    })

    return refined
  }

  return null
}


Orm.register('microsoft_contact', 'MicrosoftContact', MicrosoftContact)

module.exports = MicrosoftContact