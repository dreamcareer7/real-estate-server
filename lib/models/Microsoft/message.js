const db      = require('../../utils/db.js')
const Orm     = require('../Orm')
const squel   = require('../../utils/squel_extensions')
const request = require('request-promise-native')

const MicrosoftCredential = require('./credential')
const { getMGraphClient } = require('./plugin/client.js')
const { fetchOutlookBody, generateMMesssageRecord, generateGetByInternetMIdQuery } = require('./workers/messages/common')

const MicrosoftMessage = {}


const createEmailObject = async function (params) {
  const attachments = []

  for (const att of params.attachments) {
    const imageData = await request.get({
      url: att.link,
      encoding: 'binary'
    })

    const base64 = Buffer.from(imageData, 'binary').toString('base64')
    const size   = base64.length // in bytes

    if ( size > 4194304)
      throw Error.BadRequest('File-size could not be greater than 4-MB!')

    console.log('att.name', att.filename)
    console.log('att.contentType', att.type)
    console.log('att.size', size)

    attachments.push({
      '@odata.type': '#microsoft.graph.fileAttachment',
      'name': att.filename,
      'contentType': att.type,
      'size': size,
      'isInline': att.isInline,
      'contentBytes': base64
    })

    // attachments.push({
    //   '@odata.type': '#microsoft.graph.fileAttachment',
    //   'name': 'smile.png',
    //   'contentType': 'image/png',
    //   'contentBytes': 'iVBORw0KGgoAAAANSUhEUgAAAA0AAAAJCAIAAABmGDE9AAAAA3NCSVQICAjb4U/gAAAAGHRFWHRTb2Z0d2FyZQBtYXRlLXNjcmVlbnNob3TIlvBKAAAAm0lEQVQYlSXNQYEYMRDAMHsSdKVRPkf4NuM+KgLy58/fX+f7/Ygz+h6V8+aA9ciF645EUe4I6RKYl5n37fZu7GxTtVC12ZltMRULbm0xBFC93ZkErHxVKwNixxmo9shMSyHQKuO9xgH1/T/GsBAVWsm8tihzwIGDXymMjuJbZK8QoOmG43EW1yHeHLTtBiE1esZPFp9Ttt/KlvAP2bGGQK9w/7UAAAAASUVORK5CYII='
    // })
  }

  const toRecipients  = params.header.to ? params.header.to.map(record => ({ emailAddress: { address: record.address, name: record.name } })) : []
  const ccRecipients  = params.header.cc ? params.header.cc.map(record => ({ emailAddress: { address: record.address, name: record.name } })) : []
  const bccRecipients = params.header.bcc ? params.header.bcc.map(record => ({ emailAddress: { address: record.address, name: record.name } })) : []

  const email = {
    message: {
      conversationId: params.threadId,
      subject: params.header.subject,
  
      body: {
        contentType: 'html',
        content: params.body.html
      },
  
      from: {
        emailAddress: {
          address: params.credential.email,
          name: params.credential.display_name
        }
      },
      toRecipients: toRecipients,
      ccRecipients: ccRecipients,
      bccRecipients: bccRecipients
    },
    saveToSentItems: true
  }

  return {
    email,
    attachments
  }
}


MicrosoftMessage.getAll = async (message_ids, microsoft_credential) => {
  const messages = await db.select('microsoft/message/get', [message_ids, microsoft_credential])

  return messages
}

MicrosoftMessage.get = async (message_id, microsoft_credential) => {
  const messages = await MicrosoftMessage.getAll([message_id], microsoft_credential)

  if (messages.length < 1)
    return null

  return messages[0]
}

MicrosoftMessage.getAsThreadMember = async (microsoft_credential, message_id) => {
  const messages = await db.select('microsoft/message/get_as_thread_member', [microsoft_credential, message_id])

  if (messages.length < 1)
    return null

  return messages[0]
}

MicrosoftMessage.deleteByInternetMessageIds = async (microsoft_credential, internet_message_ids) => {
  return await db.select('microsoft/message/delete_by_internet_message_id', [
    microsoft_credential,
    internet_message_ids
  ])
}

MicrosoftMessage.getMCredentialMessagesNum = async (microsoft_credential) => {
  return await db.select('microsoft/message/count', [microsoft_credential])
}

MicrosoftMessage.publicize = async model => {
  delete model.created_at
  delete model.updated_at
  delete model.deleted_at
  delete model.data

  return model
}

MicrosoftMessage.create = async (records) => {
  return await db.chunked(records, 21, (chunk, i) => {
    const q = squel
      .insert()
      .into('microsoft_messages')
      .setFieldsRows(chunk)
      .onConflict(['microsoft_credential', 'internet_message_id'], {
        thread_id: squel.rstr('EXCLUDED.thread_id'),
        thread_key: squel.rstr('EXCLUDED.thread_key'),
        in_reply_to: squel.rstr('EXCLUDED.in_reply_to'),
        in_bound: squel.rstr('EXCLUDED.in_bound'),
        recipients: squel.rstr('EXCLUDED.recipients'),

        subject: squel.rstr('EXCLUDED.subject'),
        has_attachments: squel.rstr('EXCLUDED.has_attachments'),
        attachments: squel.rstr('EXCLUDED.attachments'),

        from_raw: squel.rstr('EXCLUDED.from_raw'),
        to_raw: squel.rstr('EXCLUDED.to_raw'),
        cc_raw: squel.rstr('EXCLUDED.cc_raw'),
        bcc_raw: squel.rstr('EXCLUDED.bcc_raw'),

        '"from"': squel.rstr('EXCLUDED.from'),
        '"to"': squel.rstr('EXCLUDED.to'),
        cc: squel.rstr('EXCLUDED.cc'),
        bcc: squel.rstr('EXCLUDED.bcc'),

        message_created_at: squel.rstr('EXCLUDED.message_created_at'),
        message_date: squel.rstr('EXCLUDED.message_date'),

        // data: squel.rstr('EXCLUDED.data'),
        updated_at: squel.rstr('now()')
      })
      .returning('id, microsoft_credential, internet_message_id, message_id')

    q.name = 'microsoft/message/bulk_upsert'

    return db.select(q)
  })  
}

MicrosoftMessage.downloadAttachment = async (mcid, mid, aid) => {
  const credential = await MicrosoftCredential.get(mcid)
  const microsoft  = await getMGraphClient(credential)

  if (!credential)
    throw Error.ResourceNotFound('Microsoft-Credential Not Found!')

  if (!microsoft)
    throw Error.BadRequest('Microsoft-Client failed!')

  const microsoftMessage = await MicrosoftMessage.get(mid, credential.id)

  if (!microsoftMessage)
    throw Error.ResourceNotFound('Related Microsoft-Message not found!')

  return await microsoft.getAttachment(mid, aid)  
}

MicrosoftMessage.sendEmail = async (params) => {
  const microsoft = await getMGraphClient(params.credential)

  if (!microsoft)
    throw Error.BadRequest('Microsoft-Client failed!')

  const { email, attachments } = await createEmailObject(params)
  email.message.attachments    = attachments

  return await microsoft.sendMultipartMessage(email)
}

MicrosoftMessage.createAndSendMessage = async (params) => {
  const microsoft = await getMGraphClient(params.credential)

  if (!microsoft)
    throw Error.BadRequest('Microsoft-Client failed!')

  const { email, attachments } = await createEmailObject(params)
  const createMessageResult    = await microsoft.createMessage(email)

  try {
    for (const attachment of attachments) {
      await microsoft.addAttachmentNative(createMessageResult.id, attachment)
    }
    
    await microsoft.sendMessage(createMessageResult.id)
  
    return createMessageResult.internetMessageId
  
  } catch (ex) {

    await microsoft.deleteDraft(createMessageResult.id)

    throw ex
  }
}

MicrosoftMessage.sendReply = async (params) => {
  // MGraph.createReply(messageId)
  // MGraph.updateMessage(messageId, message)
  // MGraph.addAttachment(messageId, attachment)
  // MGraph.sendMessage(messageId)

  const microsoft = await getMGraphClient(params.credential)

  if (!microsoft)
    throw Error.BadRequest('Microsoft-Client failed!')

  const { email, attachments } = await createEmailObject(params)
  email.message.attachments    = attachments

  const createReplyResult      = await microsoft.createReply(params.messageId)

  try {
    for (const attachment of attachments) {
      await microsoft.addAttachmentNative(createReplyResult.id, attachment)
    }

    const updateMessageResult = await microsoft.updateMessage(createReplyResult.id, email.message)
    
    await microsoft.sendMessage(updateMessageResult.id)
  
    return updateMessageResult.internetMessageId
  
  } catch (ex) {

    await microsoft.deleteDraft(createReplyResult.id)

    throw ex
  }
}

MicrosoftMessage.getRemoteMessage = async (credential, internetMessageId) => {
  const microsoft = await getMGraphClient(credential)

  if (!microsoft)
    throw Error.BadRequest('Microsoft-Client failed!')

  const url = generateGetByInternetMIdQuery(internetMessageId)

  const message = await microsoft.geMessageByUrl(url)

  const toCreateMeesagesArr = []

  toCreateMeesagesArr.push(generateMMesssageRecord(credential, message))

  await MicrosoftMessage.create(toCreateMeesagesArr)


  const outlookMessageBody = await fetchOutlookBody(microsoft, [message])
  const outlookMessage     = await MicrosoftMessage.getAsThreadMember(credential.id, message.id)

  const root = outlookMessageBody[outlookMessage.message_id]

  for (const attach of outlookMessage.attachments) {
    attach.url = `users/self/microsoft/${outlookMessage.owner}/messages/${outlookMessage.message_id}/attachments/${attach.id}`
  }

  if (root) {
    outlookMessage.snippet     = root['snippet'] || null
    outlookMessage.unique_body = root['uniqueBody'] || null
    outlookMessage.html_body   = root['htmlBody'] || null
    outlookMessage.text_body   = root['textBody'] || null
  }

  return outlookMessage
}



Orm.register('microsoft_message', 'MicrosoftMessage', MicrosoftMessage)

module.exports = MicrosoftMessage