const Context = require('../../../Context')

const MicrosoftMessage    = require('../../message')
const Email               = require('../../../Email')
const EmailCampaignEmail  = require('../../../Email/campaign/email')



const fetchBouncedMessages = async function (microsoft, lastSyncAt) {
  let messages = []

  const select = '$select=id,lastModifiedDateTime,internetMessageId,conversationId,sender,subject,from,internetMessageHeaders'
  const filter = `&$filter=startswith(subject,'Undeliverable') and from/emailAddress/address eq 'postmaster@outlook.com' and lastModifiedDateTime gt ${new Date(lastSyncAt).toISOString()}`
  const url    = `https://graph.microsoft.com/v1.0/me/messages?$top=50${select}${filter}`

  for await (const response of microsoft.discreteGetMessagessNative(url)) {
    if ( !response.value || response.value.length === 0 )
      break

    messages = messages.concat(response.value)
  }


  const internetMsgIds = []

  for ( const message of messages ) {
    if ( message.internetMessageHeaders ) {
      for ( const header of message.internetMessageHeaders ) {
        if ( header.name.toLowerCase() === 'in-reply-to' ) {
          internetMsgIds.push(header.value.substring(1, header.value.length - 1))
        }
      }
    }
  }

  return internetMsgIds
}

const handleBouncedMessages = async function (credentialId, internetMsgIds) {
  const messages   = await MicrosoftMessage.getByInternetMessageIds(credentialId, internetMsgIds)
  const messageIds = messages.map(m => m.message_id)

  const emails  = await Email.getByMicrosoftMessageIds(messageIds)
  const records = await EmailCampaignEmail.getByEmails(emails)

  for (const record of records) {
    const event = {
      email: record.email,
      event: 'failed',
      created_at: new Date().getTime(),
      recipient: record.email_address,
      object: { email_campaign_email_id: record.id }
    }
  
    await Email.addEvent(event)
  }

  return true
}


const syncBouncedMessages = async (microsoft, credential, lastSyncAt) => {
  try {

    const internetMsgIds = await fetchBouncedMessages(microsoft, lastSyncAt)

    Context.log('SyncOutlookMessages - syncBouncedMessages bounced num', internetMsgIds.length)

    if (internetMsgIds.length) {
      await handleBouncedMessages(credential.id, internetMsgIds)
    }

    Context.log('SyncOutlookMessages - syncBouncedMessages done')

    return  {
      status: true
    }

  } catch (ex) {

    Context.log(ex)
    Context.log(`SyncOutlookMessages - syncBouncedMessages - catch ex => Email: ${credential.email}, Code: ${ex.statusCode}, Message: ${ex.message}`)

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
  syncBouncedMessages
}