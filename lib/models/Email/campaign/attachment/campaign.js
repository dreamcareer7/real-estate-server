const { uniqWith } = require('lodash')
const config = require('../../../../config')

const promisify = require('util').promisify

const AttachedFile = require('../../../AttachedFile')
const Crypto = require('../../../Crypto')
const GoogleMessage = require('../../../Google/message')
const MicrosoftMessage = require('../../../Microsoft/message')
const User = require('../../../User/get')

const EmailCampaignAttachment = require('./index')
const { validateAttachmentsSize } = require('./validate')

const handleFileAttachments = (campaign) => {
  const attachments = []
  const ids = []

  const fileAttachments = campaign.attachments.filter(att => Boolean(att.file))

  if ( fileAttachments.length === 0 ) {
    return {
      ids,
      attachments
    }
  }

  for (const attachment of fileAttachments) {
    ids.push(attachment.file)

    attachments.push({
      'campaign': campaign.id,
      'file': attachment.file,
      'is_inline': attachment.is_inline,
      'content_id': attachment.content_id,
    })
  }

  return {
    ids,
    attachments
  }
}

const getPromises = async (campaign) => {
  const promises          = []
  const remoteAttachments = campaign.attachments.filter(att => Boolean(att.url))

  if ( remoteAttachments.length === 0 || process.env.NODE_ENV === 'tests' ) {
    return {
      promises,
      remoteAttachments
    }
  }

  const user = await User.get(campaign.created_by)

  for (const att of remoteAttachments) {
    // const temp = new URL(att.url)
    // const host = process.env.API_HOSTNAME || 'localhost:3078'
    // temp.host === host || 

    if ( att.url.indexOf('/emails/attachments/') > 0 ) {
      const hash = att.url.split('/').pop()
      const obj  = JSON.parse(Crypto.decrypt(decodeURIComponent(hash)))

      const cid = obj.google_credential || obj.microsoft_credential
      const mid = obj.message_remote_id
      const aid = obj.attachment_id

      let content 

      if (obj.google_credential) {
        const { attachment } = await GoogleMessage.downloadAttachment(cid, mid, aid)
        content = attachment.data
      }

      if (obj.microsoft_credential) {
        const attachment = await MicrosoftMessage.downloadAttachment(cid, mid, aid)
        content = attachment.contentBytes
      }

      promises.push(AttachedFile.saveFromBuffer({
        buffer: Buffer.from(content, 'base64'),
        filename: att.name,
        relations: [{ role: 'User', role_id: user.id }],
        public: false,
        path: user.id,
        user: user,
      }))

    } else {

      promises.push(promisify(AttachedFile.saveFromUrl)({
        url: att.url,
        filename: att.name,
        relations: [{ role: 'User', role_id: user.id }],
        public: false,
        path: user.id,
        user: user,
      }))
    }
  }

  return {
    promises,
    remoteAttachments
  }
}

const handleRemoteAttachments = async (campaign) => {
  const attachments = []
  const ids         = []

  const { promises, remoteAttachments } = await getPromises(campaign)

  const downloadAll = async () => {
    return Promise.all(promises)
  }

  const downloadedFiles = await downloadAll()

  let i = 0
  for (const file of downloadedFiles) {
    ids.push(file.id)

    attachments.push({
      'campaign': campaign.id,
      'file': file.id,
      'is_inline': remoteAttachments[i].is_inline,
      'content_id': remoteAttachments[i++].content_id,
    })
  }

  return {
    ids,
    attachments
  }
}

/**
 * @param {IEmailCampaign[]} campaigns 
 */
const insertAttachments = async (campaigns) => {
  let attachments = []
  let ids = []

  for(const campaign of campaigns) {    
    if (campaign.attachments) {

      campaign.attachments = uniqWith(campaign.attachments, function(a, b) {
        if ( a.file && b.file ) {
          return a.file === b.file
        }
      
        if ( a.url && b.url ) {
          return a.url === b.url
        }
        
        return false
      })

      const viaMicrosoft = Boolean(campaign.microsoft_credential) 
      const viaGoogle    = Boolean(campaign.google_credential)

      const fileAtts   = handleFileAttachments(campaign)
      const remtoeAtts = await handleRemoteAttachments(campaign)

      ids         = ids.concat(fileAtts.ids, remtoeAtts.ids)
      attachments = attachments.concat(fileAtts.attachments, remtoeAtts.attachments)

      let limit = config.email_composer.attachment_upload_limit.mailgun

      if (viaGoogle) {
        limit = config.email_composer.attachment_upload_limit.gmail
      }

      if (viaMicrosoft) {
        limit = config.email_composer.attachment_upload_limit.outlook
      }

      await validateAttachmentsSize(ids, limit)
    }
  }

  return await EmailCampaignAttachment.createAll(attachments)
}

module.exports = {
  insertAttachments,
}
