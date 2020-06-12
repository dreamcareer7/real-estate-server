const _ = require('lodash')
const config  = require('../../../../config')
const Context = require('../../../Context')

const MicrosoftMessage    = require('../../message')
const MicrosoftMailFolder = require('../../mail_folders')
const Email               = require('../../../Email')
const EmailCampaign       = require('../../../Email/campaign')

const { generateRecord } = require('./common')
const { syncMessagesPprojection } = require('./static')


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

    Context.log('SyncOutlookMessages - fetchMessages - messages.length:', messages.length)

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

      Context.log('SyncOutlookMessages handleEmailCampaigns Error:', ex)
    }
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

const syncMessages = async (microsoft, credential, lastSyncAt) => {
  const credentialId = credential.id

  const rechatEmailsToUpdate = []
  const microsoftMessages = []
  const projection        = syncMessagesPprojection.join(',')
  const messageIdSet      = new Set()

  let createdNum = 0

  try {

    Context.log('SyncOutlookMessages - syncMessages 1', credential.email)

    const refinedFolders  = await refineFolders(credential.id)
    const deletedMessages = await fetchDeletedMessages(microsoft, lastSyncAt)
    const spamMessages    = await fetchSpamMessages(microsoft, lastSyncAt)
    const messages        = await fetchMessages(microsoft, lastSyncAt, projection, true)
    
    const deletedMessageInternetIds = deletedMessages.map(record => record.internetMessageId)
    const deletedMessageIds         = deletedMessages.map(record => record.id)
    
    const spamMessageInternetIds    = spamMessages.map(record => record.internetMessageId)
    const spamMessageIds            = spamMessages.map(record => record.id)

    Context.log('SyncOutlookMessages - syncMessages 2', credential.email, 'messages.length:', messages.length, 'deletedMessages.length:', deletedMessages.length)

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

        message.isArchived = (refinedFolders.byId[message.parentFolderId] && refinedFolders.byId[message.parentFolderId].displayName === 'Archive') ? true : false

        const msgToPush = generateRecord(credential, message)

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

      Context.log('SyncOutlookMessages - syncMessages 3', credential.email, 'microsoftMessages.length:', microsoftMessages.length)

      const createdMessages = await MicrosoftMessage.create(microsoftMessages, credentialId)

      await handleEmailCampaigns(rechatEmailsToUpdate, credentialId)

      Context.log('SyncOutlookMessages - syncMessages 4', credential.email, 'createdMessages.length:', createdMessages.length)

      createdNum = createdMessages.length
    }

    await MicrosoftMessage.deleteByInternetMessageIds(credentialId, spamMessageInternetIds)
    await MicrosoftMessage.deleteByInternetMessageIds(credentialId, deletedMessageInternetIds)
    
    const totalMessagesNum = await MicrosoftMessage.getMCredentialMessagesNum(credentialId)

    Context.log('SyncOutlookMessages - syncMessages 5', credential.email)

    return  {
      status: true,
      createdNum,
      totalNum: totalMessagesNum[0]['count']
    }

  } catch (ex) {

    Context.log(ex)
    Context.log(`SyncOutlookMessages - syncMessages - catch ex => Email: ${credential.email}, Code: ${ex.statusCode}, Message: ${ex.message}`)

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
  syncMessages
}