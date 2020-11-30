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

const { fetchMessages, fetchDeletedMessages, fetchSpamMessages, fetchByMsgIds } = require('./fetch')
const { fetchBouncedMessages } = require('./bounced')
const { generateRecord } = require('./common')
// const { fetchBouncedMessages, setAsDelivered, setAsFailed } = require('./bounced')

const { syncMessagesPprojection } = require('./static')
const fiveXErr = [500, 501, 502, 503, 504]




const handleEmailCampaigns = async function (records, processCredential) {
  const toStoreMicrosoftIds = []
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

    toStoreMicrosoftIds.push({
      id: rec.rechat_email_id,
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

  await Email.storeMicrosoftIds(toStoreMicrosoftIds)
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

      console.log('syncByIds microsoftMessages', microsoftMessages)

      await MicrosoftMessage.create(microsoftMessages, credentialId)
    }

    return  {
      status: true
    }

  } catch (ex) {

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
