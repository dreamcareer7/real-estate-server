const _ = require('lodash')
const Context = require('../../../Context')

const MicrosoftCredential = require('../../credential')
const MicrosoftContact    = require('../../contact')
const Contact             = require('../../../Contact/index')
const ContactAttribute    = require('../../../Contact/attribute')

const { parseAttributes, findNewAttributes } = require('./helper')
const { extractPhoto } = require('./photo')

const targetKeys = [
  'givenName', 'surname', 'middleName', 'nickName', 'title',
  'photo', 'parentFolderId', 'birthday', 'personalNotes',
  'jobTitle', 'companyName', 'businessHomePage',
  'mobilePhone', 'homePhones', 'businessPhones',
  'emailAddresses', 'homeAddress', 'businessAddress', 'otherAddress'
]


const syncContacts = async (microsoft, data) => {
  const credentialId = data.microsoftCredential.id
  const lastSyncAt   = data.microsoftCredential.contacts_last_sync_at
  const brand        = data.microsoftCredential.brand
  const user         = data.microsoftCredential.user
  
  const uniqueRec  = []
  const uniqueToUp = []

  const records            = []
  const toUpdateRecords    = []
  const newContacts        = []
  const toUpdateContacts   = []
  const toUpdateContactIds = []
  const contactsMap        = {}

  let createdNum = 0

  const projection = [
    'id', 'createdDateTime', 'lastModifiedDateTime', 'changeKey', 'parentFolderId',
    'displayName', 'givenName', 'middleName', 'nickName', 'surname', 'title',
    'jobTitle', 'companyName',
    'businessHomePage', 'birthday', 'personalNotes',
    'homePhones', 'mobilePhone', 'businessPhones',
    'emailAddresses', 'homeAddress', 'businessAddress', 'otherAddress',
  ]

  try {

    Context.log('SyncMicrosoft - syncContacts 1', data.microsoftCredential.email)

    const folders  = await MicrosoftContact.getCredentialFolders(credentialId)
    const contacts = await microsoft.getContactsNative(lastSyncAt, folders, projection)

    Context.log('SyncMicrosoft - syncContacts 2 - contacts.length:', contacts.length, data.microsoftCredential.email)

    if (contacts.length) {
      
      for (const contact of contacts) {
        const file = await extractPhoto(microsoft, user, brand, contact)
        if (file) {
          contact.photo = file.url
        }
      }

      Context.log('SyncMicrosoft - syncContacts 2', data.microsoftCredential.email)
  
      const remoteIdsArr         = contacts.map(c => c.id)
      const oldMicrosoftContacts = await MicrosoftContact.getAllBySource(remoteIdsArr, credentialId, 'contacts')
      const contactFolders       = await MicrosoftContact.getRefinedContactFolders(credentialId)
      const oldMicrosoftContactRemoteIds = oldMicrosoftContacts.map(c => c.remote_id)

      for (const contact of contacts) {
        if ( oldMicrosoftContactRemoteIds.includes(contact.id) ) {

          const oldMContact = await MicrosoftContact.get(contact.id, credentialId)

          if ( !oldMContact.deleted_at && (oldMContact.data.changeKey !== contact.changeKey) ) {

            const result = await Contact.fastFilter(brand, [], { microsoft_id: oldMContact.id })

            if (result.ids[0]) {
              toUpdateContactIds.push(result.ids[0])

              contactsMap[result.ids[0]] = {
                rawData: contact,
                oldRawData: oldMContact.data,
              }
            }
            
            if ( !uniqueToUp.includes(contact.id) ) {
              uniqueToUp.push(contact.id)
              toUpdateRecords.push({ microsoft_credential: credentialId, remote_id: contact.id, data: JSON.stringify(contact) })
            }
          }          

        } else {

          if ( !uniqueRec.includes(contact.id) ) {
            uniqueRec.push(contact.id)
            records.push({ microsoft_credential: credentialId, remote_id: contact.id, data: JSON.stringify(contact) })
          }
        }
      }

      if ( toUpdateContactIds.length ) {
        const contactsAtts = await ContactAttribute.getForContacts(toUpdateContactIds)
        const refinedAtts  = _.groupBy(contactsAtts, function(entry) { return entry.contact})
  
        for (const key in refinedAtts) {
          const newAttributes = findNewAttributes(contactsMap[key], refinedAtts[key])

          if (newAttributes.length)
            toUpdateContacts.push({ id: key, attributes: newAttributes })
        }
      }

      // New Contacts
      const createdMicrosoftContacts = await MicrosoftContact.create(records)

      for (const createdMicrosoftContact of createdMicrosoftContacts) {
  
        /** @type {IContactInput} */
        const contact = {
          user: user,
          microsoft_id: createdMicrosoftContact.id,
          attributes: [{ attribute_type: 'source_type', text: 'Microsoft' }]
        }
  
        for (const key in createdMicrosoftContact.data) {
          if (targetKeys.indexOf(key) >= 0) {
            const attributes = parseAttributes(key, createdMicrosoftContact.data, contactFolders)
            contact.attributes = contact.attributes.concat(attributes)
          }
        }
  
        newContacts.push(contact)
      }

      Context.log('SyncMicrosoft - syncContacts 3', data.microsoftCredential.email)

      // Updated Contacts
      await MicrosoftContact.create(toUpdateRecords)
      await Contact.update(toUpdateContacts, user, brand, 'microsoft_integration')

      Context.log('SyncMicrosoft - syncContacts 4', data.microsoftCredential.email)

      // New Contacts
      if (newContacts.length)
        await Contact.create(newContacts, user, brand, 'microsoft_integration', { activity: false, relax: true, get: false })

      createdNum = createdMicrosoftContacts.length
    }

    const totalContactsNum = await MicrosoftContact.getMCredentialContactsNum(credentialId, ['contacts'])

    await MicrosoftCredential.updateContactsLastSyncAt(credentialId)

    Context.log('SyncMicrosoft - syncContacts 5', data.microsoftCredential.email)

    return {
      status: true,
      createdNum,
      totalNum: totalContactsNum[0]['count']
    }

  } catch (ex) {

    Context.log(`SyncMicrosoft - syncContacts - catch ex => Email: ${data.microsoftCredential.email}, Code: ${ex.statusCode}, Message: ${ex.message}`)

    if ( ex.statusCode === 504 || ex.statusCode === 503 || ex.statusCode === 501 || ex.message === 'Error: read ECONNRESET' ) {
      return  {
        status: false,
        skip: true,
        ex
      }
    }
      
    return  {
      status: false,
      skip: false,
      ex
    }
  }
}


module.exports = {
  syncContacts
}