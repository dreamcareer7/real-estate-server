const request = require('request-promise-native')
const config  = require('../../../config')

const getClient = require('../client')
const { getByMessageId } = require('./get')


const createEmailObject = async function (params) {
  const attachments = []
  const limit    = config.google_integration.attachment_size_limit
  const limitMsg = `${Math.round(limit / (1024 * 1024))}MB`

  let sizeSum = 0

  for (const att of params.attachments) {
    const binaryData = await request.get({
      url: att.url,
      encoding: 'binary'
    })

    const base64 = Buffer.from(binaryData, 'binary').toString('base64')
    const size   = base64.length // in bytes

    sizeSum += size

    if ( size > limit ) {
      throw Error.BadRequest(`File size could not be greater than ${limitMsg}!`)
    }

    attachments.push({
      'filename': att.name || att.file_name,
      'contentId': att.content_id || null, // <img src="cid:some-image-cid" alt="img" />
      'cid': att.content_id || null,
      'content': base64,
      'encoding': 'base64',
      'type': att.type
    })
  }

  if ( sizeSum > limit ) {
    throw Error.BadRequest(`Files size could not be greater than ${limitMsg}!`)
  }

  const toRecipients  = params.header.to ? params.header.to.map(record => (record.address)) : []
  const ccRecipients  = params.header.cc ? params.header.cc.map(record => (record.address)) : []
  const bccRecipients = params.header.bcc ? params.header.bcc.map(record => (record.address)) : []

  return {
    headers: {
      From: params.header.from,
      To: toRecipients.join(','),
      Cc: ccRecipients.join(','),
      Bcc: bccRecipients.join(','),
      'In-Reply-To': params.header['In-Reply-To'],
  
      Subject: params.header.subject
    },

    threadId: params.threadId,
    attachments: attachments,

    text: params.body.text,
    html: params.body.html
  }
}


/**
 * @param {UUID} gcid Google credential id
 * @param {string} mid Message remote-id
 * @param {string} aid Attachment remote-id
 */
const downloadAttachment = async (gcid, mid, aid) => {
  const google  = await getClient(gcid, 'gmail')
  const message = await getByMessageId(mid, gcid)

  if (!message)
    throw Error.ResourceNotFound('Related Google-Message Not Found!')

  let attachmentObj = null

  for (const att of message.attachments) {
    if ( att.id === aid )
      attachmentObj = att
  }

  if (!attachmentObj)
    throw Error.ResourceNotFound('Gmail message\'s attachment not found!')

  const attachment = await google.getAttachment(mid, aid)

  return {
    attachmentObj,
    attachment
  }
}

const sendEmail = async (params) => {
  const google = await getClient(params.credential.id, 'gmail')
  const body   = await createEmailObject(params)

  return await google.sendMultipartMessage(body)
}


module.exports = {
  downloadAttachment,
  sendEmail
}