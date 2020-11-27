const _ = require('lodash')
const config  = require('../../../../config')
const Context = require('../../../Context')

const MicrosoftMessage    = require('../../message')
const MicrosoftMailFolder = require('../../mail_folders')
const EmailCampaign       = require('../../../Email/campaign/thread')

const Email = {
  ...require('../../../Email/get'),
  ...require('../../../Email/store'),
}

const { generateRecord } = require('./common')
const { syncMessagesPprojection } = require('./static')
const { fetchBouncedMessages } = require('./bounced')
// const { fetchBouncedMessages, setAsDelivered, setAsFailed } = require('./bounced')



const fetchMessages = async function (microsoft, lastSyncAt, projection, fullSync = false) {
  const max = config.microsoft_integration.max_sync_emails_num
  const UTS = new Date().setMonth(new Date().getMonth() - config.microsoft_integration.backward_month_num)

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

    Context.log('SyncOutlookMessages - FetchMessages - Length:', messages.length)

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

  try {

    for await (const response of microsoft.discreteGetMessagessNative(url)) {
      if ( !response.value || response.value.length === 0 ) {
        break
      }
  
      messages = messages.concat(response.value)
    }

    return messages

  } catch (ex) {

    if ( ex.statusCode === 404 ) {
      return messages
    }

    throw ex
  }
}

const handleEmailCampaigns = async function (records, processCredential) {
  const toStoreMicrosoftIds = []
  const toSaveThreadKeys    = []
  const toSetCampaigns      = []

  for (const rec of records) {
    // const emmail     = await Email.get(rec.rechat_email_id)
    // const campaign   = await EmailCampaign.get(emmail.campaign)
    // const credential = campaign.microsoft_credential

    const campaign     = rec.rechat_campaign_id
    const credential   = rec.rechat_credential
    const message_id   = rec.microsoft_message_id
    const thread_key   = `${credential}${rec.microsoft_conversation_id}`
    const microsoft_id = rec.microsoft_message_id

    if ( credential !== processCredential ) {
      continue
    }

    // await Email.storeMicrosoftId(rec.rechat_email_id, rec.microsoft_message_id)
    toStoreMicrosoftIds.push({
      id: rec.rechat_email_id,
      microsoft_id
    })

    // await EmailCampaign.saveThreadKey(campaign.id, `${campaign.microsoft_credential}${rec.microsoft_conversation_id}`)
    toSaveThreadKeys.push({
      id: campaign,
      thread_key
    })

    toSetCampaigns.push({
      microsoft_credential: credential,
      message_id,
      campaign
    })
  }

  try {
    await Email.storeMicrosoftIds(toStoreMicrosoftIds)
    await EmailCampaign.saveThreadKeys(toSaveThreadKeys)
    await MicrosoftMessage.setCampaigns(toSetCampaigns)
  } catch (ex) {
    Context.log('SyncOutlookMessages HandleEmailCampaigns Error:', ex)
    throw ex
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
  const microsoftMessages    = []
  const projection   = syncMessagesPprojection.join(',')
  const messageIdSet = new Set()

  try {
    Context.log('SyncOutlookMessages - SyncMessages 1')

    const refinedFolders   = await refineFolders(credential.id)
    const deletedMessages  = await fetchDeletedMessages(microsoft, lastSyncAt)
    const spamMessages     = await fetchSpamMessages(microsoft, lastSyncAt)
    const messages         = await fetchMessages(microsoft, lastSyncAt, projection, true)
    const bouncedIntMsgIds = await fetchBouncedMessages(microsoft, lastSyncAt)

    const deliveredMessageIds = []
    const archivedMessageInternetIds = []

    const deletedMessageInternetIds = deletedMessages.map(record => record.internetMessageId.substring(1, record.internetMessageId.length - 1))
    const deletedMessageIds         = deletedMessages.map(record => record.id)
    
    const spamMessageInternetIds    = spamMessages.map(record => record.internetMessageId.substring(1, record.internetMessageId.length - 1))
    const spamMessageIds            = spamMessages.map(record => record.id)

    Context.log('SyncOutlookMessages - SyncMessages 2 - Length:', messages.length, 'Deleted Length:', deletedMessages.length)

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

        if (message.isArchived) {
          archivedMessageInternetIds.push(message.internetMessageId.substring(1, message.internetMessageId.length - 1))
        }

        const msgToPush = generateRecord(credential, message)

        if ( !messageIdSet.has(msgToPush.internet_message_id) ) {
          microsoftMessages.push(msgToPush)
          messageIdSet.add(msgToPush.internet_message_id)
        }

        if ( message.extensions ) {
          let rechatCampaignId = ''
          let rechatCredential = ''
          let rechatEmailId = ''
          let rechatHost    = ''

          for ( const record of message.extensions ) {
            if ( record.id === config.microsoft_integration.openExtension.outlook.id ) {
              rechatCampaignId = record.rechatCampaignId
              rechatCredential = record.rechatCredential
              rechatEmailId = record.rechatEmailId
              rechatHost    = record.rechatHost
            }
          }

          if ( (rechatHost === process.env.API_HOSTNAME) && (rechatEmailId !== '') ) {
            rechatEmailsToUpdate.push({
              microsoft_message_id: message.id,
              microsoft_conversation_id: message.conversationId,
              rechat_campaign_id: rechatCampaignId,
              rechat_credential: rechatCredential,
              rechat_email_id: rechatEmailId
            })

            // Filter out sent messages by Rechat
            if ( !msgToPush.in_bound && !bouncedIntMsgIds.includes(msgToPush.message_id) ) {
              deliveredMessageIds.push(message.id)
            }
          }
        }
      }

      Context.log('SyncOutlookMessages - SyncMessages 3 - Length:', microsoftMessages.length)

      await MicrosoftMessage.create(microsoftMessages, credentialId)
      await handleEmailCampaigns(rechatEmailsToUpdate, credentialId)

      Context.log('SyncOutlookMessages - SyncMessages 4 - Length:', microsoftMessages.length)
    }

    const intIds = spamMessageInternetIds.concat(deletedMessageInternetIds).concat(archivedMessageInternetIds)
    await MicrosoftMessage.deleteByInternetMessageIds(credentialId, intIds)

    Context.log('SyncOutlookMessages - SyncMessages 5')

    // await setAsDelivered(deliveredMessageIds)
    // await setAsFailed(credential, bouncedIntMsgIds)

    return  {
      status: true
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

const syncByIds = async (microsoft, credential, messageIds) => {

  try {


    return  {
      status: true
    }

  } catch (ex) {

    const fiveXErr = [500, 501, 502, 503, 504]
    if ( fiveXErr.includes(Number(ex.statusCode)) || ex.message === 'Error: read ECONNRESET' ) {    
      return  {
        status: false,
        ex
      }
    }
      
    return  {
      status: false,
      ex
    }
  }
}


module.exports = {
  syncMessages,
  syncByIds
}
