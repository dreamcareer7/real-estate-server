const { keyBy } = require('lodash')
const config    = require('../../../../config')

const MicrosoftMessage    = require('../../message')
const MicrosoftMailFolder = require('../../mail_folders')
const EmailCampaign       = require('../../../Email/campaign/thread')

const Email = {
  ...require('../../../Email/get'),
  ...require('../../../Email/store'),
}

const { fetchMessages, fetchDeletedMessages, fetchSpamMessages, fetchByMsgIds } = require('./fetch')
const { fetchBouncedMessages } = require('./bounced')
const { generateRecord } = require('./common')
// const { fetchBouncedMessages, setAsDelivered, setAsFailed } = require('./bounced')

const { syncMessagesPprojection } = require('./static')
const fiveXErr = [500, 501, 502, 503, 504]



const handleEmailCampaigns = async function (records, processCredential) {
  const toStoreMicrosoftResponse = []
  const toSaveThreadKeys    = []
  const toSetCampaigns      = []

  for (const rec of records) {
    const campaign     = rec.rechat_campaign_id
    const credential   = rec.rechat_credential
    const message_id   = rec.microsoft_message_id
    const thread_key   = `${credential}${rec.microsoft_conversation_id}`
    const microsoft_id = rec.microsoft_message_id

    if ( credential !== processCredential ) {
      continue
    }

    toStoreMicrosoftResponse.push({
      id: rec.rechat_email_id,
      sent_at: rec.sent_at,
      microsoft_id
    })

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

  await Email.storeMicrosoftResponse(toStoreMicrosoftResponse)
  await EmailCampaign.saveThreadKeys(toSaveThreadKeys)
  await MicrosoftMessage.setCampaigns(toSetCampaigns)
}

const refineFolders = async (credentialId) => {
  // do this part later
  // folders listed through the beta-version will be used to list sub-folders

  // we dont need this part. we want to be able to know all emails root-parent folder-name
  // const filtered = fobj.vOne.folders.filter(folder => wellKnownFolders.one.includes(folder.displayName))

  const fobj = await MicrosoftMailFolder.getByCredential(credentialId)

  return {
    byName: keyBy(fobj.folders.vOne, 'displayName'),
    byId: keyBy(fobj.folders.vOne, 'id')
  }
}

const deduplicate = (rootMsgs, inboxMsgs) => {
  const inboxMsgIds = inboxMsgs.map(msg => msg.id)
  const temp = inboxMsgs

  for(const msg of rootMsgs) {
    if( !inboxMsgIds.includes(msg.id) ) {
      temp.push(msg)
    }
  }

  return temp
}

const syncMessages = async (microsoft, credential, lastSyncAt) => {
  const credentialId = credential.id

  const rechatEmailsToUpdate = []
  const microsoftMessages    = []
  const projection   = syncMessagesPprojection.join(',')
  const messageIdSet = new Set()

  try {

    /*
      Due to the known issue on Microsoft Graph APIs,
      We need to sync Inbox folder and then deduplicate messages.

      More details: https://stackoverflow.com/questions/35850076/microsoft-graph-not-returning-messages-with-a-date-filter
    */

    const refinedFolders   = await refineFolders(credential.id)
    const deletedMessages  = await fetchDeletedMessages(microsoft, lastSyncAt)
    const spamMessages     = await fetchSpamMessages(microsoft, lastSyncAt)
    const rootMsgs         = await fetchMessages(microsoft, lastSyncAt, projection, 'root', true)
    const inboxMsgs        = await fetchMessages(microsoft, lastSyncAt, projection, 'inbox', true)
    const bouncedIntMsgIds = await fetchBouncedMessages(microsoft, lastSyncAt)

    const deliveredMessageIds = []
    const archivedMessageInternetIds = []

    const deletedMessageIds         = deletedMessages.map(r => r.id)
    const deletedMessageInternetIds = deletedMessages
      .filter(r => r.internetMessageId)
      .map(r => r.internetMessageId.substring(1, r.internetMessageId.length - 1))
    
    const spamMessageIds         = spamMessages.map(r => r.id)
    const spamMessageInternetIds = spamMessages
      .filter(r => r.internetMessageId)
      .map(r => r.internetMessageId.substring(1, r.internetMessageId.length - 1))

    const messages = deduplicate(rootMsgs, inboxMsgs)
    

    if ( messages.length ) {

      for ( const message of messages ) {

        // Unknown bug by outlook, Its not clear why from and sender could be null!!
        if( !message.from && !message.sender ) {
          continue
        }

        // In outlook, some messages could be inside both Inbox and DeletedItems folders simultaneously.
        if ( message.parentFolder !== 'inbox' ) {
          if( deletedMessageInternetIds.includes(message.internetMessageId) || deletedMessageIds.includes(message.id) ) {
            continue
          }

          message.isArchived = false
          if((refinedFolders.byId[message.parentFolderId] && refinedFolders.byId[message.parentFolderId].displayName === 'Archive') ||
          (spamMessageInternetIds.includes(message.internetMessageId) || spamMessageIds.includes(message.id))) {
            message.isArchived = true
          }
        }
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
              rechat_email_id: rechatEmailId,
              sent_at: message.sentDateTime
            })

            // Filter out sent messages by Rechat
            if ( !msgToPush.in_bound && !bouncedIntMsgIds.includes(msgToPush.message_id) ) {
              deliveredMessageIds.push(message.id)
            }
          }
        }
      }

      await MicrosoftMessage.create(microsoftMessages, credentialId)
      await handleEmailCampaigns(rechatEmailsToUpdate, credentialId)
    }

    const intIds = spamMessageInternetIds.concat(deletedMessageInternetIds).concat(archivedMessageInternetIds)
    await MicrosoftMessage.deleteByInternetMessageIds(credentialId, intIds)

    // await setAsDelivered(deliveredMessageIds)
    // await setAsFailed(credential, bouncedIntMsgIds)

    return  {
      status: true
    }

  } catch (ex) {

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
  const credentialId = credential.id

  const microsoftMessages = []
  const projection   = syncMessagesPprojection.join(',')
  const messageIdSet = new Set()

  try {
    const messages = await fetchByMsgIds(microsoft, messageIds, projection)

    if ( messages.length ) {

      for ( const message of messages ) {

        // Unknown bug by outlook, Its not clear why from and sender could be null!!
        if( !message.from && !message.sender ) {
          continue
        }

        const msgToPush = generateRecord(credential, message)

        if ( !messageIdSet.has(msgToPush.internet_message_id) ) {
          microsoftMessages.push(msgToPush)
          messageIdSet.add(msgToPush.internet_message_id)
        }
      }

      await MicrosoftMessage.create(microsoftMessages, credentialId)
    }

    return  {
      status: true
    }

  } catch (ex) {
      
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
