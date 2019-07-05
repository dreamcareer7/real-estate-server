const mimelib = require('mimelib')
const uuid = require('uuid')

const MicrosoftCredential = require('../../credential')
const MicrosoftContact    = require('../../contact')
const MicrosoftMessage    = require('../../message')
const Contact             = require('../../../Contact/index')


const targetKeys = ['title', 'emailAddresses']


const fetchMessages = async function (microsoft, lastSyncAt, projection) {
  const max = 5
  const UTS = new Date().setMonth(new Date().getMonth() - 5)

  let messages = []

  const filter = lastSyncAt ? (`&$filter=createdDateTime ge ${new Date(lastSyncAt).toISOString()}`) : ''
  const select = projection ? (`&$select=${projection}`) : ''

  for await (const response of microsoft.discreteGeMessagessNative(filter, select)) {
    if ( !response.value || response.value.length === 0 )
      break

    const fetchedMessages = response.value
    messages = messages.concat(fetchedMessages)

    const currentMsgCreatedDateTime = new Date(fetchedMessages[fetchedMessages.length - 1]['createdDateTime'])
    const currentMsgCreatedDateTS   = Number(currentMsgCreatedDateTime.getTime())

    if( messages.length >= max || currentMsgCreatedDateTS <= UTS )
      break
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


const extractContacts = async (microsoft, data) => {
  const lastSyncAt   = data.microsoftCredential.contacts_last_sync_at
  const currentEmail = data.microsoftCredential.email
  const credentialId = data.microsoftCredential.id
  const user         = data.microsoftCredential.user
  const brand        = data.microsoftCredential.brand

  const records     = []
  const newContacts = []

  let createdNum = 0
  let totalNum   = 0

  try {

    const projection = 'id,createdDateTime,from,sender,toRecipients,ccRecipients,bccRecipients,subject'

    const messages = await fetchMessages(microsoft, lastSyncAt, projection)
    console.log(messages)
  
    if ( messages.length ) {

      let recipients = []
      const recipientsSet = new Set()

      const oldMicrosoftContactEmailSet = await MicrosoftContact.getMCredentialContactsAddress(credentialId)
      console.log('oldMicrosoftContactEmailSet', oldMicrosoftContactEmailSet)

      for ( const message of messages ) {
        const fromAddress   = message.from.emailAddress ? message.from.emailAddress.address : null
        const senderAddress = message.sender.emailAddress ? message.sender.emailAddress.address : null

        if ( fromAddress !== currentEmail && senderAddress !== currentEmail )
          continue

        /*
          to, css, bcc = [{
            "emailAddress": {
              "name": "destinition@beyte-rahbari.com",
              "address": "destinition@beyte-rahbari.com"
            }
          }]
        */

        let recipientsArr = []
        recipientsArr = recipientsArr.concat(message.toRecipients.emailAddress.address)
        recipientsArr = recipientsArr.concat(message.ccRecipients.emailAddress.address)
        recipientsArr = recipientsArr.concat(message.bccRecipients.emailAddress.address)

        for (const entry of recipientsArr) {
          if ( !recipientsSet.has(entry.emailAddress.address) && !oldMicrosoftContactEmailSet.has(entry.emailAddress.address) )
            recipients.push(entry.emailAddress)

          recipientsSet.add(entry.emailAddress.address)
        }
      }

      console.log('recipients', recipients)

      // insert new contacts (check duplicate)
      for (const recipient of recipients) {
        const data = {
          title: recipient.name,
          emailAddresses: recipient
        }

        records.push({ microsoft_credential: credentialId, remote_id: recipient, data: JSON.stringify(data), source: 'sentBox' })
      }

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
            const attributes = parseAttributes(key, createdMicrosoftContact.data)
            contact.attributes = contact.attributes.concat(attributes)
          }
        }

        newContacts.push(contact)
      }

      if (newContacts.length)
        await Contact.create(newContacts, user, brand, 'microsoft_integration', { activity: false, relax: true, get: false })

      createdNum = createdMicrosoftContacts.length
    }

    return  {
      status: true,
      createdNum: createdNum,
      totalNum: totalNum
    }

  } catch (ex) {

    return  {
      status: false,
      ex: ex,
      createdNum: 0,
      totalNum: 0
    }
  }
}

const syncMessages = async (microsoft, data) => {
  const lastSyncAt   = data.microsoftCredential.messages_last_sync_at
  const currentEmail = data.microsoftCredential.email
  const credentialId = data.microsoftCredential.id

  const microsoftMessages = []

  let createdNum = 0
  let totalNum   = 0

  try {
  
    const messages = await fetchMessages(microsoft, lastSyncAt)

    if ( messages.length ) {

      for ( const message of messages ) {
        const from = message.from.emailAddress.address || message.sender.emailAddress.address || null

        let type = 'none'

        if (from) {
          type = 'inBox'

          if ( from === currentEmail )
            type = 'sentBox'
        }

        microsoftMessages.push({
          microsoft_credential: credentialId,
          message_id: message.id,
          data: JSON.stringify(message),
          type: type
        })
      }
  
      const createdMessages = await MicrosoftMessage.create(microsoftMessages)
      
      createdNum = createdMessages.length  
    }
    
    const totalMessagesNum = await MicrosoftMessage.getMCredentialMessagesNum(credentialId)
    totalNum = totalMessagesNum[0]['count']

    await MicrosoftCredential.updateMessagesLastSyncAt(credentialId)

    return  {
      status: true,
      createdNum: createdNum,
      totalNum: totalNum
    }

  } catch (ex) {

    return  {
      status: false,
      ex: ex,
      createdNum: 0,
      totalNum: 0
    }
  }
}

module.exports = {
  syncMessages,
  extractContacts
}