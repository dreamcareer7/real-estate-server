const db    = require('../../utils/db.js')
const Orm   = require('../Orm')
const squel = require('../../utils/squel_extensions')

const MicrosoftContact = {}


MicrosoftContact.getAll = async (remote_ids, microsoft_credential) => {
  return await db.select('microsoft/contact/get', [remote_ids, microsoft_credential])
}

MicrosoftContact.get = async (remote_id, microsoft_credential) => {
  const contacts = await MicrosoftContact.getAll([remote_id], microsoft_credential)

  if (contacts.length < 1)
    return null

  return contacts[0]
}

MicrosoftContact.getAllBySource = async (remote_ids, microsoft_credential, source) => {
  return await db.select('microsoft/contact/get_by_source', [remote_ids, microsoft_credential, source])
}

MicrosoftContact.getMCredentialContactsAddress = async (credentialId, sourceArr) => {
  const contacts = await db.select('microsoft/contact/get_by_credential', [credentialId])
  const emails   = new Set()

  if (!sourceArr)
    sourceArr = ['contacts', 'sentBox']

  if ( contacts.length > 0 ) {
    for (const contact of contacts) {
      for (const address of contact.data.emailAddresses) {

        if ( sourceArr.includes(contact.source) )
          emails.add(address.address)
      }
    }
  }
  
  return emails
}

MicrosoftContact.getMCredentialContactsNum = async (microsoft_credential, sourceArr) => {
  return await db.select('microsoft/contact/count', [microsoft_credential, sourceArr])
}

MicrosoftContact.create = async (records) => {
  return await db.chunked(records, 4, (chunk, i) => {
    const q = squel
      .insert()
      .into('microsoft_contacts')
      .setFieldsRows(chunk)
      .onConflict(['microsoft_credential', 'remote_id'], {
        data: squel.rstr('EXCLUDED.data'),
        source: squel.rstr('EXCLUDED.source'),
        updated_at: squel.rstr('now()')
      })
      .returning('id, microsoft_credential, remote_id, data, source')

    q.name = 'microsoft/contact/bulk_upsert'

    return db.select(q)
  })  
}

MicrosoftContact.addContactFolder = async (credential, contactFolder) => {
  return db.insert('microsoft/contact_folder/insert', [credential.id, contactFolder.folder_id, contactFolder.parent_folder_id, contactFolder.display_name])
}

MicrosoftContact.getCredentialFolders = async (credentialId) => {
  const contactFolders = await db.select('microsoft/contact_folder/get_by_credential', [credentialId])

  const folderIds = []

  for ( const contactFolder of contactFolders )
    folderIds.push(contactFolder.folder_id)

  return folderIds
}

MicrosoftContact.getRefinedContactFolders = async (credentialId) => {
  const contactFolders = await db.select('microsoft/contact_folder/get_by_credential', [credentialId])

  if ( contactFolders.length > 0 ) {

    const refined = {}

    contactFolders.map(cf => {
      refined[cf.folder_id] = cf.display_name
    })

    return refined
  }

  return null
}


Orm.register('microsoft_contact', 'MicrosoftContact', MicrosoftContact)

module.exports = MicrosoftContact