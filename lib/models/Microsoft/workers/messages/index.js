const config  = require('../../../../config')
const Context = require('../../../Context')

const MicrosoftCredential = require('../../credential')
const MicrosoftContact    = require('../../contact')
const MicrosoftMessage    = require('../../message')
const Contact             = require('../../../Contact/index')
const Email               = require('../../../Email')
const EmailCampaign       = require('../../../Email/campaign')

const { syncMessagesPprojection, extractContactsProjection, generateMMesssageRecord } = require('./common')



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

  const url = `https://graph.microsoft.com/v1.0/me/messages?$top=250${query}`

  for await (const response of microsoft.discreteGetMessagessNative(url)) {
    if ( !response.value || response.value.length === 0 )
      break

    const fetchedMessages = response.value
    messages = messages.concat(fetchedMessages)

    const currentMsgModifiedDateTime = new Date(fetchedMessages[fetchedMessages.length - 1]['lastModifiedDateTime'])
    const currentMsgModifiedDateTS   = Number(currentMsgModifiedDateTime.getTime())

    const currentMsgCreatedDateTime  = new Date(fetchedMessages[fetchedMessages.length - 1]['createdDateTime'])
    const currentMsgCreatedDateTS    = Number(currentMsgCreatedDateTime.getTime())

    const toCheckTS = fullSync ? currentMsgModifiedDateTS : currentMsgCreatedDateTS

    Context.log('SyncMicrosoft - fetchMessages - messages.length:', messages.length)

    if( messages.length >= max || toCheckTS <= UTS )
      break
  }

  return messages
}

const fetchDeletedMessages = async function (microsoft, lastSyncAt) {
  let messages = []

  const query = `&$select=id,internetMessageId&$filter=lastModifiedDateTime ge ${new Date(lastSyncAt).toISOString()}`
  const url   = `https://graph.microsoft.com/v1.0/me/mailFolders/deleteditems/messages?$top=250${query}`

  for await (const response of microsoft.discreteGetMessagessNative(url)) {
    if ( !response.value || response.value.length === 0 )
      break

    messages = messages.concat(response.value)
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
  const currentEmail = data.microsoftCredential.email
  const credentialId = data.microsoftCredential.id
  const lastSyncAt   = data.microsoftCredential.contacts_last_extract_at
  const user         = data.microsoftCredential.user
  const brand        = data.microsoftCredential.brand

  const records     = []
  const newContacts = []

  const projection  = extractContactsProjection.join(',')
  const targetKeys  = ['title', 'emailAddresses']
  
  let createdNum = 0

  try {

    const messages = await fetchMessages(microsoft, lastSyncAt, projection)

    Context.log('SyncMicrosoft - extractContacts 1', data.microsoftCredential.email)

    if ( messages.length ) {

      const recipients    = []
      const recipientsSet = new Set()

      const oldMicrosoftContactEmailSet = await MicrosoftContact.getMCredentialContactsAddress(credentialId)

      for ( const message of messages ) {
        // Unknown bug by outlook, Its not clear why from and sender could be null!!
        // https://kb.intermedia.net/article/21942
        if( !message.from && !message.sender )
          continue

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

    Context.log('SyncMicrosoft - extractContacts 2', data.microsoftCredential.email)

    const totalContactsNum = await MicrosoftContact.getMCredentialContactsNum(credentialId, ['sentBox', 'contacts'])

    await MicrosoftCredential.updateContactsLastExtractAt(credentialId)

    Context.log('SyncMicrosoft - extractContacts 3', data.microsoftCredential.email)

    return  {
      status: true,
      createdNum: createdNum,
      totalNum: totalContactsNum[0]['count']
    }

  } catch (ex) {

    Context.log('SyncMicrosoft - extractContacts - catch ex', data.microsoftCredential.email, ex.message)

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

const handleEmailCampaigns = async function (records, credentialId) {
  for (const rec of records) {
    try {

      const currentEmmail   = await Email.get(rec.rechat_email_id)
      const currentCampaing = await EmailCampaign.get(currentEmmail.campaign)
  
      if ( currentCampaing.microsoft_credential !== credentialId )
        continue
  
      await Email.storeMicrosoftId(rec.rechat_email_id, rec.microsoft_message_id)
      await EmailCampaign.saveThreadKey(currentCampaing.id, `${currentCampaing.microsoft_credential}${rec.microsoft_conversation_id}`)

    } catch (ex) {

      Context.log('SyncMicrosoft handleEmailCampaigns Error:', ex)
    }
  }
}

const syncMessages = async (microsoft, data) => {
  const lastSyncAt   = data.microsoftCredential.messages_last_sync_at
  const credentialId = data.microsoftCredential.id

  const rechatEmailsToUpdate = []
  const microsoftMessages = []
  const projection        = syncMessagesPprojection.join(',')
  const messageIdSet      = new Set()

  let createdNum = 0

  try {

    Context.log('SyncMicrosoft - syncMessages 1', data.microsoftCredential.email)

    const deletedMessages = await fetchDeletedMessages(microsoft, lastSyncAt)
    const messages        = await fetchMessages(microsoft, lastSyncAt, projection, true)
    
    const deletedMessageInternetIds = deletedMessages.map(record => record.internetMessageId)

    Context.log('SyncMicrosoft - syncMessages 2', data.microsoftCredential.email, 'messages.length:', messages.length, 'deletedMessages.length:', deletedMessages.length)

    if ( messages.length ) {

      for ( const message of messages ) {
        // Unknown bug by outlook, Its not clear why from and sender could be null!!
        if( !message.from && !message.sender )
          continue

        if( deletedMessageInternetIds.includes(message.internetMessageId) )
          continue

        const msgToPush = generateMMesssageRecord(data.microsoftCredential, message)

        if ( !messageIdSet.has(msgToPush.internet_message_id) ) {
          microsoftMessages.push(msgToPush)
          messageIdSet.add(msgToPush.internet_message_id)
        }

        if ( message.internetMessageHeaders ) {
          let x_rechat_email = ''
          let x_rechat_host  = ''

          for ( const header of message.internetMessageHeaders ) {
            if ( header.name.toLowerCase() === 'x-rechat-email-id' )
              x_rechat_email = header.value

            if ( header.name.toLowerCase() === 'x-rechat-host' )
              x_rechat_host = header.value
          }

          if ( (x_rechat_host === process.env.API_HOSTNAME) && (x_rechat_email !== '') ) {
            rechatEmailsToUpdate.push({
              rechat_email_id: x_rechat_email,
              microsoft_message_id: message.id,
              microsoft_conversation_id: message.conversationId
            })
          }
        }
      }

      Context.log('SyncMicrosoft - syncMessages 3', data.microsoftCredential.email, 'microsoftMessages.length:', microsoftMessages.length)

      const createdMessages = await MicrosoftMessage.create(microsoftMessages)

      await handleEmailCampaigns(rechatEmailsToUpdate, credentialId)

      Context.log('SyncMicrosoft - syncMessages 4', data.microsoftCredential.email, 'createdMessages.length:', createdMessages.length)

      createdNum = createdMessages.length
    }

    await MicrosoftMessage.deleteByInternetMessageIds(credentialId, deletedMessageInternetIds)
    
    const totalMessagesNum = await MicrosoftMessage.getMCredentialMessagesNum(credentialId)

    await MicrosoftCredential.updateMessagesLastSyncAt(credentialId)

    Context.log('SyncMicrosoft - syncMessages 5', data.microsoftCredential.email)

    return  {
      status: true,
      createdNum: createdNum,
      totalNum: totalMessagesNum[0]['count']
    }

  } catch (ex) {

    Context.log('SyncMicrosoft - syncMessages - catch ex', data.microsoftCredential.email, ex.message)

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