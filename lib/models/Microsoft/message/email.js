const request = require('request-promise-native')
const Context = require('../../Context')
const User    = require('../../User/get')

const getClient = require('../client')
const { getByMessageId } = require('./get')


const handleBigAttachments = async function (microsoft, messageId, attachments) {
  for await (const att of attachments) {
    const attachment = {
      name: att.name || att.file_name,
      url: att.url
    }

    await microsoft.uploadSession(messageId, attachment)
  }
}

const handleAttachments = async function (attachments) {
  const limit     = 31457280 // 26MB
  const limit_alt = 3145728 // 3MB
  const limitMsg  = `${Math.round(limit / (1024 * 1024))}MB`

  let sizeSum = 0

  const processed      = []
  const bigAttachments = []

  for (const att of attachments) {
    const imageData = await request.get({
      url: att.url,
      encoding: 'binary'
    })

    const data    = Buffer.from(imageData, 'binary')
    const base64  = data.toString('base64')
    const size    = data.length // in bytes

    sizeSum += size

    if ( size > limit ) {
      throw Error.BadRequest(`File size could not be greater than ${limitMsg}!`)
    }

    if ( size <= limit_alt ) {
      processed.push({
        '@odata.type': '#microsoft.graph.fileAttachment',
        'name': att.name || att.file_name,
        'ContentId': att.content_id || null, // <img src="cid:some-image-cid" alt="img" />
        'contentType': att.type,
        'size': size,
        'isInline': att.is_inline,
        'contentBytes': base64
      })
    } else {
      att.size = size
      bigAttachments.push(att)
    }
  }

  if ( sizeSum > limit ) {
    throw Error.BadRequest(`Files size could not be greater than ${limitMsg}!`)
  }

  return {
    attachments: processed,
    bigAttachments
  }
}

const createEmailObject = async function (params) {
  const { attachments, bigAttachments } = await handleAttachments(params.attachments)
  const user = await User.get(params.credential.user)

  const toRecipients  = params.header.to ? params.header.to.map(record => ({ emailAddress: { address: record.address, name: record.name } })) : []
  const ccRecipients  = params.header.cc ? params.header.cc.map(record => ({ emailAddress: { address: record.address, name: record.name } })) : []
  const bccRecipients = params.header.bcc ? params.header.bcc.map(record => ({ emailAddress: { address: record.address, name: record.name } })) : []

  // Outlook does not let us to change the sender/from name
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
          name: ( user.first_name && user.last_name ) ? `${user.first_name} ${user.last_name}` : params.credential.display_name
        }
      },
      toRecipients: toRecipients,
      ccRecipients: ccRecipients,
      bccRecipients: bccRecipients,

      extensions: params.extensions,
      internetMessageHeaders: params.internetMessageHeaders
    },
    saveToSentItems: true
  }

  return {
    email,
    attachments,
    bigAttachments
  }
}



/**
 * @param {UUID} mcid Microsoft credential id
 * @param {string} mid Message remote-id
 * @param {string} aid Attachment remote-id
 */
const downloadAttachment = async (mcid, mid, aid) => {
  const microsoft = await getClient(mcid, 'outlook')
  const message   = await getByMessageId(mid, mcid)

  if (!message) {
    throw Error.ResourceNotFound('Related Outlook-Message Not Found!')
  }

  try {

    return await microsoft.getAttachmentNative(mid, aid)  

  } catch (ex) {
    
    // remove outlook sensitive data in request object
    delete ex.options
    delete ex.response

    throw ex
  }
}

/**
 * @param {Object} params
 */
const createAndSendMessage = async (params) => {
  const microsoft = await getClient(params.credential.id, 'outlook')
  const { email, attachments, bigAttachments } = await createEmailObject(params)
  const createMessageResult = await microsoft.createMessage(email)

  try {
    for (const attachment of attachments) {
      await microsoft.addAttachmentNative(createMessageResult.id, attachment)
    }

    await handleBigAttachments(microsoft, createMessageResult.id, bigAttachments)

    const updateMessageResult = await microsoft.updateMessage(createMessageResult.id, email.message)

    await microsoft.sendMessage(updateMessageResult.id)

    return {
      internetMessageId: updateMessageResult.internetMessageId,
      conversationId: updateMessageResult.conversationId
    }

  } catch (ex) {

    Context.log('outlook-createAndSendMessage-failed', params.credential.id, ex.message)

    await microsoft.deleteDraft(createMessageResult.id)
    throw ex
  }
}

/**
 * @param {Object} params
 */
const sendReply = async (params) => {
  const microsoft = await getClient(params.credential.id, 'outlook')
  const { email, attachments, bigAttachments } = await createEmailObject(params)
  email.message.attachments = attachments
  const createReplyResult   = await microsoft.createReply(params.messageId)

  try {
    for (const attachment of attachments) {
      await microsoft.addAttachmentNative(createReplyResult.id, attachment)
    }

    await handleBigAttachments(microsoft, createReplyResult.id, bigAttachments)

    const updateMessageResult = await microsoft.updateMessage(createReplyResult.id, email.message)
    
    await microsoft.updateMessageExtensionsNative(updateMessageResult.id, email.message.extensions[0])
    await microsoft.sendMessage(updateMessageResult.id)

    return
  
  } catch (ex) {

    Context.log('outlook-sendReply-failed', params.credential.id, ex.message)

    await microsoft.deleteDraft(createReplyResult.id)
    throw ex
  }
}


module.exports = {
  downloadAttachment,
  createAndSendMessage,
  sendReply
}