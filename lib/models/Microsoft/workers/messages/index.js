const _ = require('lodash')
const config  = require('../../../../config')
const Context = require('../../../Context')

const MicrosoftCredential = require('../../credential')
const MicrosoftContact    = require('../../contact')
const MicrosoftMessage    = require('../../message')
const MicrosoftMailFolder = require('../../mail_folders')
const Contact             = require('../../../Contact/index')
const Email               = require('../../../Email')
const EmailCampaign       = require('../../../Email/campaign')

const { syncMessagesPprojection, extractContactsProjection, generateRecord } = require('./common')



const fetchMessages = async function (microsoft, lastSyncAt, projection, fullSync = false) {
  const max = config.microsoft_sync.max_sync_emails_num
  const UTS = new Date().setMonth(new Date().getMonth() - config.microsoft_sync.backward_month_num)

  let messages = []

  const filter_1 = lastSyncAt ? (`&$filter=isDraft eq false and createdDateTime ge ${new Date(lastSyncAt).toISOString()}`) : '&$filter=isDraft eq false'
  const filter_2 = lastSyncAt ? (`&$filter=isDraft eq false and lastModifiedDateTime ge ${new Date(lastSyncAt).toISOString()}`) : '&$filter=isDraft eq false'
  const select   = projection ? (`&$select=${projection}`) : ''
  const expand   = `&$expand=attachments($select=id,name,contentType,size,isInline),extensions($filter=id eq '${config.microsoft_integration.openExtension.outlook.name}')`

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

const fetchSpamMessages = async function (microsoft, lastSyncAt) {
  let messages = []

  const query = `&$select=id,internetMessageId&$filter=lastModifiedDateTime ge ${new Date(lastSyncAt).toISOString()}`
  const url   = `https://graph.microsoft.com/v1.0/me/mailFolders/junkemail/messages?$top=250${query}`

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

const listFolders = async (microsoft) => {
  const { vBeta, vOne } = await microsoft.listFolders()

  if (vBeta.error) {
    Context.log('SyncMicrosoft - fetchMessages - listFolders-version-beta-failed', vBeta.error.message, vBeta.error)
  }

  if (vOne.error) {
    Context.log('SyncMicrosoft - fetchMessages - listFolders-version-one-failed', vOne.error.message, vOne.error)
  }

  return {
    vBeta: vBeta.folders,
    vOne: vOne.folders
  }
}

const refineFolders = async (credentialId) => {
  // do this part later
  // folders listed through the beta-version will be used to list sub-folders

  // we dont need this part. we want to be able to know all emails root-parent folder-name
  // const filtered = fobj.vOne.folders.filter(folder => wellKnownFolders.one.includes(folder.displayName))

  const fobj = await MicrosoftMailFolder.getByCredential(credentialId)

  return {
    byName: _.keyBy(fobj.folders.vOne, 'displayName'),
    byId: _.keyBy(fobj.folders.vOne, 'id')
  }
}


const syncFolders = async (microsoft, data) => {
  const fobj = await listFolders(microsoft)

  return await MicrosoftMailFolder.upsertFolders(data.microsoftCredential.id, fobj)
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

        if (recipient.address) {
          records.push({
            microsoft_credential: credentialId,
            remote_id: recipient.address,
            data: JSON.stringify(data),
            source: 'sentBox'
          })
        }
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
      createdNum,
      totalNum: totalContactsNum[0]['count']
    }

  } catch (ex) {

    Context.log(`SyncMicrosoft - extractContacts - catch ex => Email: ${data.microsoftCredential.email}, Code: ${ex.statusCode}, Message: ${ex.message}`)

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

    const refinedFolders  = await refineFolders(data.microsoftCredential.id)
    const deletedMessages = await fetchDeletedMessages(microsoft, lastSyncAt)
    const spamMessages    = await fetchSpamMessages(microsoft, lastSyncAt)
    const messages        = await fetchMessages(microsoft, lastSyncAt, projection, true)
    
    const deletedMessageInternetIds = deletedMessages.map(record => record.internetMessageId)
    const deletedMessageIds         = deletedMessages.map(record => record.id)
    
    const spamMessageInternetIds    = spamMessages.map(record => record.internetMessageId)
    const spamMessageIds            = spamMessages.map(record => record.id)

    Context.log('SyncMicrosoft - syncMessages 2', data.microsoftCredential.email, 'messages.length:', messages.length, 'deletedMessages.length:', deletedMessages.length)

    if ( messages.length ) {

      for ( const message of messages ) {

        // Unknown bug by outlook, Its not clear why from and sender could be null!!
        if( !message.from && !message.sender ) {
          continue
        }

        if( deletedMessageInternetIds.includes(message.internetMessageId) || deletedMessageIds.includes(message.id) ) {
          continue
        }

        if( spamMessageInternetIds.includes(message.internetMessageId) || spamMessageIds.includes(message.id) ) {
          continue
        }

        message.isArchived = (refinedFolders.byId[message.parentFolderId].displayName === 'Archive') ? true : false

        const msgToPush = generateRecord(data.microsoftCredential, message)

        if ( !messageIdSet.has(msgToPush.internet_message_id) ) {
          microsoftMessages.push(msgToPush)
          messageIdSet.add(msgToPush.internet_message_id)
        }

        if ( message.extensions ) {
          let rechatEmailId = ''
          let rechatHost    = ''

          for ( const record of message.extensions ) {
            if ( record.id === config.microsoft_integration.openExtension.outlook.id ) {
              rechatEmailId = record.rechatEmailId
              rechatHost    = record.rechatHost
            }
          }

          if ( (rechatHost === process.env.API_HOSTNAME) && (rechatEmailId !== '') ) {
            rechatEmailsToUpdate.push({
              rechat_email_id: rechatEmailId,
              microsoft_message_id: message.id,
              microsoft_conversation_id: message.conversationId
            })
          }
        }
      }

      Context.log('SyncMicrosoft - syncMessages 3', data.microsoftCredential.email, 'microsoftMessages.length:', microsoftMessages.length)

      const createdMessages = await MicrosoftMessage.create(microsoftMessages, credentialId)

      await handleEmailCampaigns(rechatEmailsToUpdate, credentialId)

      Context.log('SyncMicrosoft - syncMessages 4', data.microsoftCredential.email, 'createdMessages.length:', createdMessages.length)

      createdNum = createdMessages.length
    }

    await MicrosoftMessage.deleteByInternetMessageIds(credentialId, spamMessageInternetIds)
    await MicrosoftMessage.deleteByInternetMessageIds(credentialId, deletedMessageInternetIds)
    
    const totalMessagesNum = await MicrosoftMessage.getMCredentialMessagesNum(credentialId)

    await MicrosoftCredential.updateMessagesLastSyncAt(credentialId)

    Context.log('SyncMicrosoft - syncMessages 5', data.microsoftCredential.email)

    return  {
      status: true,
      createdNum,
      totalNum: totalMessagesNum[0]['count']
    }

  } catch (ex) {

    Context.log(ex)
    Context.log(`SyncMicrosoft - syncMessages - catch ex => Email: ${data.microsoftCredential.email}, Code: ${ex.statusCode}, Message: ${ex.message}`)

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
  syncFolders,
  syncMessages,
  extractContacts
}
