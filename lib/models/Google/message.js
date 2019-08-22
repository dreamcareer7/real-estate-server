const db      = require('../../utils/db.js')
const Orm     = require('../Orm')
const squel   = require('../../utils/squel_extensions')
const fs      = require('fs')
const request = require('request-promise-native')

const GoogleCredential    = require('./credential')
const { getGoogleClient } = require('./plugin/client.js')


const GoogleMessage = {}



GoogleMessage.getAll = async (message_ids, google_credential) => {
  const messages = await db.select('google/message/get', [message_ids, google_credential])

  return messages
}

GoogleMessage.get = async (message_id, google_credential) => {
  const messages = await GoogleMessage.getAll([message_id], google_credential)

  if (messages.length < 1)
    return null

  return messages[0]
}

GoogleMessage.getGCredentialMessagesNum = async (google_credential) => {
  return await db.select('google/message/count', [google_credential])
}

GoogleMessage.publicize = async (model) => {
  delete model.created_at
  delete model.updated_at
  delete model.deleted_at
  delete model.data

  return model
}

GoogleMessage.create = async (records) => {
  return await db.chunked(records, 23, (chunk, i) => {
    const q = squel
      .insert()
      .into('google_messages')
      .setFieldsRows(chunk)
      .onConflict(['google_credential', 'message_id'], {
        thread_id: squel.rstr('EXCLUDED.thread_id'),
        thread_key: squel.rstr('EXCLUDED.thread_key'),
        history_id: squel.rstr('EXCLUDED.history_id'),
        internet_message_id: squel.rstr('EXCLUDED.internet_message_id'),
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

        data: squel.rstr('EXCLUDED.data'),
        updated_at: squel.rstr('now()')
      })
      .returning('id, google_credential, message_id')
      // .returning('id, google_credential, message_id, thread_id, history_id, recipients, in_bound, message_date, message_created_at, data')

    q.name = 'google/message/bulk_upsert'

    return db.select(q)
  })  
}

GoogleMessage.downloadAttachment = async (gcid, mid, aid) => {
  const credential    = await GoogleCredential.get(gcid)
  const googleMessage = await GoogleMessage.get(mid, credential.id)
  const google        = await getGoogleClient(credential)

  if (!credential)
    throw Error.ResourceNotFound('Google-Credential Not Found!')

  if (!googleMessage)
    throw Error.ResourceNotFound('Related Google-Message Not Found!')

  if (!google)
    throw Error.BadRequest('Google-Client Failed!')

  let attachmentObj = null

  for (const att of googleMessage.attachments) {
    if ( att.id === aid )
      attachmentObj = att
  }

  if (!attachmentObj)
    throw Error.ResourceNotFound('Google-Message-Attachment Not Found!')

  const attachment = await google.getAttachment(mid, aid)

  return {
    attachmentObj,
    attachment
  }
}

GoogleMessage.sendEmail = async (gcid, threadId) => {
  const credential = await GoogleCredential.get(gcid)
  const google     = await getGoogleClient(credential)

  if (!credential)
    throw Error.ResourceNotFound('Google-Credential Not Found!')

  if (!google)
    throw Error.BadRequest('Google-Client Failed!')


  const remote_pic = 'https://d2dzyv4cb7po1i.cloudfront.net/21c04d82-0e8d-11e8-b6c0-0ae785638eb4/081a6420-c4db-11e9-b74d-459d3759cce0.jpg'

  const imageData = await request.get({
    url: remote_pic,
    encoding: 'binary'
  })

  const base64Img   = Buffer.from(imageData, 'binary').toString("base64")

  const oneBase64   = fs.readFileSync('/home/saeed/Projects/www/rechat/gmail-sender/one.jpg').toString('base64')
  const twoBase64   = fs.readFileSync('/home/saeed/Projects/www/rechat/gmail-sender/two.jpg').toString('base64')
  const threeBase64 = fs.readFileSync('/home/saeed/Projects/www/rechat/gmail-sender/three.jpg').toString('base64')
  const fourBase64  = fs.readFileSync('/home/saeed/Projects/www/rechat/gmail-sender/four.jpg').toString('base64')

  const docBase64  = fs.readFileSync('/home/saeed/Projects/www/rechat/gmail-sender/doc.pdf').toString('base64')
  const fileBase64  = fs.readFileSync('/home/saeed/Projects/www/rechat/gmail-sender/file.zip').toString('base64')

  const attachments_arr = [
    {
      filename: 'stallmanxxx.jpg',
      content: base64Img,
      encoding: 'base64',
      type: 'image/jpeg'
    },

    {
      filename: 'doc.pdf',
      content: docBase64,
      encoding: 'base64',
      type: 'application/pdf'
    },
    {
      filename: 'file.zip',
      content: fileBase64,
      encoding: 'base64',
      type: 'application/zip'
    },

    {
      filename: 'one.jpg',
      content: oneBase64,
      encoding: 'base64',
      type: 'image/jpeg'
    },
    {
      filename: 'two.jpg',
      content: twoBase64,
      encoding: 'base64',
      type: 'image/jpeg'
    },
    {
      filename: 'three.jpg',
      content: threeBase64,
      encoding: 'base64',
      type: 'image/jpeg'
    },
    {
      filename: 'four.jpg',
      content: fourBase64,
      encoding: 'base64',
      type: 'image/jpeg'
    }
  ]

  const attachments = [
    attachments_arr[0]
  ]

  const email = {
    to: 'saeed.vayghan@gmail.com',
    subject: 'this-is-test-subject ***',
    textBody: 'this-is-text-body',
    htmlBody: '<b>this-is-html-body</b>'
  }

  return await google.sendMultipartMessage(email, threadId, attachments)
}


Orm.register('google_message', 'GoogleMessage', GoogleMessage)

module.exports = GoogleMessage