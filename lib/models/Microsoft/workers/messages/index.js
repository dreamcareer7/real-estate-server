const config = require('../../../../config')
const sq     = require('../../../../utils/squel_extensions')

const MicrosoftCredential = require('../../credential')
const MicrosoftContact    = require('../../contact')
const MicrosoftMessage    = require('../../message')
const Contact             = require('../../../Contact/index')


const fetchMessages = async function (microsoft, lastSyncAt, projection, fullSync = false) {
  const max = config.microsoft_sync.max_sync_emails_num
  const UTS = new Date().setMonth(new Date().getMonth() - config.microsoft_sync.backward_month_num)

  let messages = []

  const filter_1 = lastSyncAt ? (`&$filter=isDraft eq false and createdDateTime ge ${new Date(lastSyncAt).toISOString()}`) : '&$filter=isDraft eq false'
  const filter_2 = lastSyncAt ? (`&$filter=isDraft eq false and lastModifiedDateTime ge ${new Date(lastSyncAt).toISOString()}`) : '&$filter=isDraft eq false'
  const select   = projection ? (`&$select=${projection}`) : ''
  const expand   = '&$expand=attachments($select=id,name,contentType,size,isInline)'

  let query = `${filter_1}${select}`

  if (fullSync)
    query = `${filter_2}${select}${expand}`

  for await (const response of microsoft.discreteGeMessagessNative(query)) {
    if ( !response.value || response.value.length === 0 )
      break

    const fetchedMessages = response.value
    messages = messages.concat(fetchedMessages)

    const currentMsgModifiedDateTime = new Date(fetchedMessages[fetchedMessages.length - 1]['lastModifiedDateTime'])
    const currentMsgModifiedDateTS   = Number(currentMsgModifiedDateTime.getTime())

    const currentMsgCreatedDateTime  = new Date(fetchedMessages[fetchedMessages.length - 1]['createdDateTime'])
    const currentMsgCreatedDateTS    = Number(currentMsgCreatedDateTime.getTime())

    const toCheckTS = fullSync ? currentMsgModifiedDateTS : currentMsgCreatedDateTS

    if( messages.length >= max || toCheckTS <= UTS )
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

const validateEmail = (email) => {
  if (!email)
    return false

  const re = /\S+@\S+\.\S+/

  return re.test(email)
}

const parseRecipients = (message) => {
  const recipients = new Set()

  if (validateEmail(message.from.emailAddress.address))
    recipients.add(message.from.emailAddress.address)

  if (validateEmail(message.sender.emailAddress.address))
    recipients.add(message.sender.emailAddress.address)

  for (const record of message.toRecipients ) {
    if(validateEmail(record.emailAddress.address))
      recipients.add(record.emailAddress.address)
  }

  for (const record of message.ccRecipients ) {
    if(validateEmail(record.emailAddress.address))
      recipients.add(record.emailAddress.address)
  }

  for (const record of message.bccRecipients ) {
    if(validateEmail(record.emailAddress.address))
      recipients.add(record.emailAddress.address)
  }

  const recipientsArr = Array.from(recipients)

  const from_raw = (message.from) ? message.from.emailAddress : {}
  const to_raw   = (message.toRecipients.length) ? message.toRecipients.map(record => record.emailAddress) : []
  const cc_raw   = (message.ccRecipients.length) ? message.ccRecipients.map(record => record.emailAddress) : []
  const bcc_raw  = (message.bccRecipients.length) ? message.bccRecipients.map(record => record.emailAddress) : []

  const from = `${from_raw['name']} <${from_raw['address']}>`
  const to   = to_raw.map(record => record.address)
  const cc   = cc_raw.map(record => record.address)
  const bcc  = bcc_raw.map(record => record.address)

  return {
    recipientsArr,
    from_raw,
    to_raw,
    cc_raw,
    bcc_raw,
    from,
    to,
    cc,
    bcc
  }
}


const extractContacts = async (microsoft, data) => {
  const currentEmail = data.microsoftCredential.email
  const credentialId = data.microsoftCredential.id
  const lastSyncAt   = data.microsoftCredential.contacts_last_extract_at
  const user         = data.microsoftCredential.user
  const brand        = data.microsoftCredential.brand

  const records     = []
  const newContacts = []

  const projection  = 'id,createdDateTime,from,sender,toRecipients,ccRecipients,bccRecipients,subject,isDraft'
  const targetKeys  = ['title', 'emailAddresses']
  
  let createdNum = 0

  try {

    const messages = await fetchMessages(microsoft, lastSyncAt, projection)
  
    if ( messages.length ) {

      const recipients    = []
      const recipientsSet = new Set()

      const oldMicrosoftContactEmailSet = await MicrosoftContact.getMCredentialContactsAddress(credentialId)

      for ( const message of messages ) {
        const fromAddress   = message.from.emailAddress ? message.from.emailAddress.address : null
        const senderAddress = message.sender.emailAddress ? message.sender.emailAddress.address : null

        if ( fromAddress !== currentEmail && senderAddress !== currentEmail )
          continue

        let recipientsArr = []

        recipientsArr = recipientsArr.concat(message.toRecipients)
        recipientsArr = recipientsArr.concat(message.ccRecipients)
        recipientsArr = recipientsArr.concat(message.bccRecipients)

        for (const entry of recipientsArr) {
          if ( !recipientsSet.has(entry.emailAddress.address) && !oldMicrosoftContactEmailSet.has(entry.emailAddress.address) )
            recipients.push(entry.emailAddress)

          recipientsSet.add(entry.emailAddress.address)
        }
      }

      // insert new contacts (check duplicate)
      for (const recipient of recipients) {
        const data = {
          title: recipient.name,
          emailAddresses: [recipient]
        }

        records.push({ microsoft_credential: credentialId, remote_id: recipient.address, data: JSON.stringify(data), source: 'sentBox' })
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

    const totalContactsNum = await MicrosoftContact.getMCredentialContactsNum(credentialId, ['sentBox', 'contacts'])

    await MicrosoftCredential.updateContactsLastExtractAt(credentialId)

    return  {
      status: true,
      createdNum: createdNum,
      totalNum: totalContactsNum[0]['count']
    }

  } catch (ex) {

    if ( ex.statusCode === 504 || ex.statusCode === 503 || ex.statusCode === 501 ) {
      return  {
        status: false,
        ex: ex,
        ex_msg: 'Microsoft-Error',
        createdNum: 0,
        totalNum: 0
      }
    }
      
    return  {
      status: false,
      ex: ex,
      ex_msg: 'general',
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

  const projectionArr = [
    'id', 'conversationId',
    'internetMessageHeaders', 'internetMessageId',
    'createdDateTime', 'lastModifiedDateTime',
    'sender', 'from', 'toRecipients', 'ccRecipients', 'bccRecipients',
    'hasAttachments', 'subject', 'isDraft'
    // 'bodyPreview', 'uniqueBody', 'body'
  ]

  const projection = projectionArr.join(',')

  let createdNum = 0

  try {
  
    const messages = await fetchMessages(microsoft, lastSyncAt, projection, true)

    if ( messages.length ) {

      for ( const message of messages ) {
        const fromAddress = message.from.emailAddress.address || message.sender.emailAddress.address || null

        let inBound = true

        if (fromAddress) {
          if ( fromAddress === currentEmail )
            inBound = false
        }

        let inReplyTo = null

        if ( message.internetMessageHeaders ) {
          for ( const header of message.internetMessageHeaders ) {
            if ( header.name.toLowerCase() === 'in-reply-to' )
              inReplyTo = header.value.substring(1, header.value.length - 1)
          }
        }

        const internetMessageId = message.internetMessageId.substring(1, message.internetMessageId.length - 1)     

        const { recipientsArr, from_raw, to_raw, cc_raw, bcc_raw, from, to, cc, bcc } = parseRecipients(message)

        microsoftMessages.push({
          microsoft_credential: credentialId,
          message_id: message.id,
          thread_id: message.conversationId,
          thread_key: `${credentialId}${message.conversationId}`,
          internet_message_id: internetMessageId,
          in_reply_to: inReplyTo,
          in_bound: inBound,
          recipients: `{${recipientsArr.join(',')}}`,

          subject: message.subject,
          has_attachments: (message.attachments.length > 0) ? true : false,
          attachments: JSON.stringify(message.attachments),

          from_raw: JSON.stringify(from_raw),
          to_raw: JSON.stringify(to_raw),
          cc_raw: JSON.stringify(cc_raw),
          bcc_raw: JSON.stringify(bcc_raw),

          '"from"': from,
          '"to"': sq.SqArray.from(to || []),
          cc: sq.SqArray.from(cc || []),
          bcc: sq.SqArray.from(bcc || []),

          message_created_at: Number(new Date(message.createdDateTime).getTime()),
          message_date: new Date(message.createdDateTime).toISOString(),

          data: JSON.stringify(message)
        })
      }
  
      const createdMessages = await MicrosoftMessage.create(microsoftMessages)

      createdNum = createdMessages.length
    }
    
    const totalMessagesNum = await MicrosoftMessage.getMCredentialMessagesNum(credentialId)

    await MicrosoftCredential.updateMessagesLastSyncAt(credentialId)

    return  {
      status: true,
      createdNum: createdNum,
      totalNum: totalMessagesNum[0]['count']
    }

  } catch (ex) {

    if ( ex.statusCode === 504 || ex.statusCode === 503 || ex.statusCode === 501 ) {
      return  {
        status: false,
        ex: ex,
        ex_msg: 'Microsoft-Error',
        createdNum: 0,
        totalNum: 0
      }
    }
  
    return  {
      status: false,
      ex: ex,
      ex_msg: 'general',
      createdNum: 0,
      totalNum: 0
    }
  }
}


module.exports = {
  syncMessages,
  extractContacts
}