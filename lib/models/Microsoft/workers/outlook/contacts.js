const config = require('../../../../config')

const Contact = require('../../../Contact/manipulate')
const MicrosoftContact = require('../../contact')
// const { handleNewRecords } = require('../contacts/people/receiver')

const { extractContactsProjection } = require('./static')
const projection = extractContactsProjection.join(',')
const targetKeys = ['title', 'emailAddresses']


const fetchSentMessages = async function (microsoft, lastSyncAt, projection) {
  const max = config.microsoft_integration.max_parse_sent_emails_num

  let messages = []

  const filter = lastSyncAt ? (`&$filter=createdDateTime ge ${new Date(lastSyncAt).toISOString()}`) : ''
  const select = projection ? (`&$select=${projection}`) : ''

  const query = `${filter}${select}`

  const url = `https://graph.microsoft.com/v1.0/me/MailFolders/sentitems/messages?$top=250${query}`

  for await (const response of microsoft.discreteGetMessagessNative(url)) {
    if ( !response.value || response.value.length === 0 ) {
      break
    }

    const fetchedMessages = response.value
    messages = messages.concat(fetchedMessages)

    if( messages.length >= max ) {
      break
    }
  }

  return messages
}

const parseAttributes = (key, data) => {
  /** @type {IContactAttributeInput[]} */
  const attributes = []

  if ( key === 'title' ) {
    if (data.title) {
      attributes.push({
        attribute_type: 'title',
        text: data.title
      })
    }
  }

  if (key === 'emailAddresses') {
    for (let i = 0; i < data.emailAddresses.length; i++) {
      attributes.push({
        attribute_type: 'email',
        text: data.emailAddresses[i]['address'],
        label: 'Other',
        is_primary: i === 0 ? true : false
      })
    }
  }

  return attributes
}

const extractContacts = async (microsoft, credential, lastSyncAt) => {
  const currentEmail = credential.email
  const credentialId = credential.id
  const user         = credential.user
  const brand        = credential.brand

  let createdNum = 0

  try {

    const mEmailSet = await MicrosoftContact.getMCredentialContactsAddress(credentialId)
    const messages  = await fetchSentMessages(microsoft, lastSyncAt, projection)

    if ( messages.length ) {

      const recipients    = []
      const recipientsSet = new Set()

      for ( const message of messages ) {
        // Unknown bug by outlook, Its not clear why from and sender could be null!!
        // https://kb.intermedia.net/article/21942
        if( !message.from && !message.sender ) {
          continue
        }

        const fromAddress   = message.from.emailAddress ? message.from.emailAddress.address : null
        const senderAddress = message.sender.emailAddress ? message.sender.emailAddress.address : null

        if ( fromAddress !== currentEmail && senderAddress !== currentEmail ) {
          continue
        }

        let recipientsArr = []

        recipientsArr = recipientsArr.concat(message.toRecipients)
        recipientsArr = recipientsArr.concat(message.ccRecipients)
        recipientsArr = recipientsArr.concat(message.bccRecipients)

        for (const entry of recipientsArr) {
          if ( !recipientsSet.has(entry.emailAddress.address) && !mEmailSet.has(entry.emailAddress.address) ) {
            recipients.push(entry.emailAddress)
          }

          recipientsSet.add(entry.emailAddress.address)
        }
      }

      const validRecipients = recipients.filter(r => r.address)
      const validRecipientAddresses = validRecipients.map(r => r.address) // <== remote_id

      const newContacts = validRecipients.map(recipient => {
        /** @type {IContactInput} */
        const contactObj = {
          user: user,
          attributes: [{ attribute_type: 'source_type', text: 'Microsoft' }],
          parked: true
        }

        const data = {
          title: recipient.name,
          emailAddresses: [recipient]
        }
  
        for (const key in data) {
          if (targetKeys.indexOf(key) >= 0) {
            const attributes      = parseAttributes(key, data)
            contactObj.attributes = contactObj.attributes.concat(attributes)
          }
        }

        return contactObj
      })

      const createdContactIds = await Contact.create(newContacts, user, brand, 'microsoft_integration', { activity: false, relax: true, get: false })

      const newMContacts = validRecipients.map(recipient => {
        const index = validRecipientAddresses.indexOf(recipient.address)

        const data = {
          title: recipient.name,
          emailAddresses: [recipient]
        }  

        return {
          microsoft_credential: credentialId,
          contact: createdContactIds[index],
          remote_id: recipient.address,
          data: JSON.stringify(data),
          source: 'sentBox',
          etag: null,
          parked: true
        }
      })

      const createdMicrosoftContacts = await MicrosoftContact.create(newMContacts)

      //  ???
      // await handleNewRecords(createdMicrosoftContacts)

      createdNum = createdMicrosoftContacts.length
    }

    return  {
      status: true,
      createdNum
    }

  } catch (ex) {

    const fiveXErr = [500, 501, 502, 503, 504]
    if ( fiveXErr.includes(Number(ex.statusCode)) || ex.message === 'Error: read ECONNRESET' ) {    
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
  extractContacts
}
