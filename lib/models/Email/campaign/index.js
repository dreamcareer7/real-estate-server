const { EventEmitter } = require('events')

const config = require('../../../config')
const _ = require('lodash')
const mjml2html = require('mjml')
const uuid = require('uuid')
const promisify = require('util').promisify

const expect = require('../../../utils/validator').expect
const db = require('../../../utils/db')
const render = require('../../../utils/render')

const AttachedFile = require('../../AttachedFile')
const Context = require('../../Context')
const Orm = require('../../Orm')
const Socket = require('../../Socket')
const User = require('../../User')
const Contact = require('../../Contact')

const htmlToText = require('../html-to-text')

const Email = require('../index')
const MicrosoftCredential = require('../../Microsoft/credential')
const GoogleCredential = require('../../Google/credential')

const EmailCampaign = {}
const emitter = new EventEmitter
EmailCampaign.on = emitter.on.bind(emitter)

global['EmailCampaign'] = EmailCampaign

const EmailCampaignEmail = require('./email')
const EmailCampaignRecipient = require('./recipient')
const EmailCampaignAttachment = require('./attachments')

require('./stats')

EmailCampaign.CREATE_EVENT = 'email_campaign:create'
EmailCampaign.SEND_EVENT = 'email_campaign:send'
EmailCampaign.DELETE_EVENT = 'email_campaign:delete'
EmailCampaign.STATS_EVENT = 'email_campaign:stats'



/**
 * @param {IEmailCampaignInput[]} campaigns 
 */
const insert = async campaigns => {
  campaigns.forEach(campaign => {
    if (!campaign.text)
      campaign.text = htmlToText(campaign.html)

    /*
     * Mailgun doesn't allow sending an email with no text and no html.
     * However, user's tend to do that (eg send an attachment with no body)
     * Also, Mailgun doesn't allow setting them as "". It needs at least a space.
     * More info at server#1381
     */
    if (_.isEmpty(campaign.text) && _.isEmpty(campaign.html))
      campaign.text = ' '
  })

  return db.selectIds('email/campaign/insert', [JSON.stringify(campaigns)])
}

const validateAttachmentsSize = async (ids, viaGoogle) => {
  let limit = config.microsoft_integration.attachment_size_limit
  if (viaGoogle) limit = config.google_integration.attachment_size_limit

  const files = await AttachedFile.getAll(ids)
  
  if (files.length === 0)
    return

  const promises = []

  for (const file of files) {
    promises.push(AttachedFile.getFileSize(file))
  }

  let sizeSum = 0

  Promise.all(promises).then(function(result) {
    for (const size of result) {

      const base64Size = ((size + 3 - 1) / 3) * 4

      if ( base64Size > limit )
        throw Error.BadRequest('File size could not be greater than 4MB!')
  
      sizeSum += base64Size
    }
  })

  if ( sizeSum > limit)
    throw Error.BadRequest('Files size could not be greater than 4MB!')
}

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

const handleRemoteAttachments = async (campaign) => {
  const promises    = []
  const attachments = []
  const ids = []

  const remoteAttachments = campaign.attachments.filter(att => Boolean(att.url))

  if ( remoteAttachments.length === 0 || process.env.NODE_ENV === 'tests' ) {
    return {
      ids,
      attachments
    }
  }

  const user = await User.get(campaign.created_by)

  for (const attachment of remoteAttachments) {
    promises.push(promisify(AttachedFile.saveFromUrl)({
      url: attachment.url,
      filename: attachment.name,
      relations: [{
        role: 'User',
        role_id: campaign.created_by
      }],
      public: false,
      path: campaign.created_by,
      user: user,
    }))
  }

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
      const viaMicrosoft = Boolean(campaign.microsoft_credential) 
      const viaGoogle    = Boolean(campaign.google_credential)
      const viaMailgun   = !viaMicrosoft && !viaGoogle

      const fileAtts   = handleFileAttachments(campaign)
      const remtoeAtts = await handleRemoteAttachments(campaign)
      
      ids = ids.concat(fileAtts.ids, remtoeAtts.ids)
      attachments = attachments.concat(fileAtts.attachments, remtoeAtts.attachments)

      if (!viaMailgun)
        await validateAttachmentsSize(ids, viaGoogle)
    }
  }

  return await EmailCampaignAttachment.createAll(attachments)
}

const sendIndividualCampaign = async ({email, recipients = [], campaign, user}) => {
  const contact_ids = recipients
    .map(r => r.contact)
    .filter(Boolean)


  const contacts = await Contact.getAll(contact_ids)
  const indexed = _.keyBy(contacts, 'id')

  const subjectCompiler = await render.compileText(email.subject || '')
  const textBodyCompiler = await render.compileText(email.text || '')
  const htmlBodyCompiler = await render.compileHtml(email.html || '')

  const renderer = async recipient => {
    const contact = indexed[recipient.contact] || {
      email: recipient.email
    }

    const subject = await subjectCompiler.render({
      recipient: contact,
      user
    })

    const text = await textBodyCompiler.render({
      recipient: contact,
      user
    })

    const html = await htmlBodyCompiler.render({
      recipient: contact,
      user
    })

    return {
      ...email,
      subject,
      html,
      text,
      tags: [campaign.brand],
      to: [recipient.email]
    }
  }

  const renderAll = async () => {
    const promises = recipients.map(renderer)
    return Promise.all(promises)
  }

  const emails = await renderAll()

  subjectCompiler.release()
  textBodyCompiler.release()
  htmlBodyCompiler.release()

  Context.log(`Rendering is completed for ${emails.length} `)

  const saved = await Email.createAll(emails)

  const campaign_emails = recipients.map((to, i) => {
    return {
      ...to,
      email: saved[i],
      campaign: campaign.id,
      email_address: to.email
    }
  })

  const created_email_ids = await EmailCampaignEmail.createAll(campaign_emails)
  emitter.emit('sent', {
    brand: campaign.brand,
    individual: true,
    campaign: campaign.id,
    emails: created_email_ids
  })
}

const sendCampaign = async ({email, recipients = [], campaign, user}) => {
  const grouped = _.groupBy(recipients, 'send_type')

  email.to = _.map(grouped.To, 'email')
  email.cc = _.map(grouped.CC, 'email')
  email.bcc = _.map(grouped.BCC, 'email')
  email.tags = [campaign.brand]

  /*
   * In case of normal email campaigns, we still wanted to support
   * template variables. But since we have only 1 email address,
   * we cannot render it per-recipient.
   * Therefore, we render if for To recipient #1.
   * Please note that this _assumes_ that there's a To recipient.
   * As of current date, Mailgun forces us to have at least 1 To recipient.
   * Therefore that's a given. Although there's no guarantee that the To
   * recipient will have a contact.
   */

  const primaryRecpient = Array.isArray(grouped.To) ? grouped.To[0] : null

  const contact_id = primaryRecpient ? primaryRecpient.id : null

  const contact = contact_id ? (await Contact.get(contact_id)) : null

  const subjectCompiler = await render.compileText(email.subject || '')
  const textBodyCompiler = await render.compileText(email.text || '')
  const htmlBodyCompiler = await render.compileHtml(email.html || '')

  const subject = await subjectCompiler.render({
    recipient: contact,
    user
  })

  const text = await textBodyCompiler.render({
    recipient: contact,
    user
  })

  const html = await htmlBodyCompiler.render({
    recipient: contact,
    user
  })

  subjectCompiler.release()
  textBodyCompiler.release()
  htmlBodyCompiler.release()

  const saved = await Email.create({
    ...email,
    subject,
    html,
    text
  })

  const campaign_emails = recipients.map(to => {
    return {
      ...to,
      email: saved.id,
      email_address: to.email,
      campaign: campaign.id
    }
  })

  const created_email_ids = await EmailCampaignEmail.createAll(campaign_emails)
  emitter.emit('sent', {
    brand: campaign.brand,
    individual: false,
    campaign: campaign.id,
    emails: created_email_ids
  })
}

const validate = async campaign => {
  const { html, text, subject } = campaign

  if ( campaign.google_credential && campaign.microsoft_credential )
    throw Error.Validation('It is not allowed to send both google and microsoft ceredentials.')


  // Validate google and microsoft credential
  const viaMicrosoft = Boolean(campaign.microsoft_credential) 
  const viaGoogle    = Boolean(campaign.google_credential)
  const viaMailgun   = !viaMicrosoft && !viaGoogle

  if ( viaMicrosoft || viaGoogle ) {
    let credential
  
    if (viaMicrosoft)
      credential = await MicrosoftCredential.hasSendEmailAccess(campaign.microsoft_credential)
  
    if (viaGoogle)
      credential = await GoogleCredential.hasSendEmailAccess(campaign.google_credential)


    if ( credential.user !== campaign.from )
      throw Error.Validation('Invalid user!')
  
    if (credential.revoked)
      throw Error.Validation('Credential is revoked!')
  
    if ( credential.deleted_at )
      throw Error.Validation('Credential is deleted!')
  }

  // Validate attachments
  if (campaign.attachments) {
    for (const attachment of campaign.attachments) {
      expect(Boolean(!attachment.file) && Boolean(!attachment.url), 'Attachment\'s file or url is missed!').to.equal(false)
      expect(Boolean(attachment.file) && Boolean(attachment.url), 'It is not allowed to send both attachments\'s file and url').to.equal(false)

      if ( !attachment.file && attachment.url ) {
        if (!attachment.name)
          throw Error.Validation('Attachment\'s name is missed!')
      }

      if (!viaMailgun) {
        if (attachment.is_inline) {
          if (!attachment.content_id)
            throw Error.Validation('Attachment\'s content-id is missed!')
        }
      }
    }
  }

  const email = {
    subject, html, text
  }

  try {
    const subjectCompiler = await render.compileText(email.subject || '')
    subjectCompiler.release()
  } catch(e) {
    Context.log(e)
    throw Error.Validation('Error in formatting of subject')
  }

  try {
    const htmlBodyCompiler = await render.compileHtml(email.html || '')
    htmlBodyCompiler.release()
  } catch(e) {
    Context.error(e)
    throw Error.Validation('Error in formatting of body')
  }

  try {
    const textBodyCompiler = await render.compileText(email.text || '')
    textBodyCompiler.release()
  } catch(e) {
    Context.error(e)
    throw Error.Validation('Error in formatting of text body')
  }
}

/**
 * @param {UUID} id 
 */
const markAsExecuted = async id => {
  await db.query.promise('email/campaign/mark-as-executed', [id])
}



/**
 * @param {UUID[]} ids
 * @returns {Promise<IEmailCampaign[]>}
 */
EmailCampaign.getAll = async ids => {
  const associations = Orm.getEnabledAssociations()
  const conditions = Orm.getAssociationConditions('email_campaign.emails')

  return db.select('email/campaign/get', [ids, associations, conditions ? conditions.contact : null])
}

/**
 * @param {UUID} id
 * @returns {Promise<IEmailCampaign>}
 */
EmailCampaign.get = async id => {
  const campaigns = await EmailCampaign.getAll([id])


  if (campaigns.length < 1)
    throw Error.ResourceNotFound(`Email Campaign ${id} not found`)

  return campaigns[0]
}

/**
 * @param {UUID} brand
 */
EmailCampaign.getByBrand = async brand => {
  const ids = await db.selectIds('email/campaign/by_brand', [brand])

  return EmailCampaign.getAll(ids)
}

EmailCampaign.notify = (event, user, brand, ids, data = {}) => {
  Socket.send(
    event,
    brand,
    [{ user, brand, ids, ...data }],

    err => {
      if (err) Context.error(`Error sending ${event} socket event.`, err)
    }
  )
}

/**
 * @param {IEmailCampaignInput[]} campaigns
 */
EmailCampaign.createMany = async (campaigns) => {
  for(const campaign of campaigns)
    await validate(campaign)

  const template_instance_ids = campaigns
    .map(campaign => campaign.template)
    .filter(Boolean)

  const template_instances = await TemplateInstance.getAll(template_instance_ids)
  const indexed_instances = _.keyBy(template_instances, 'id')

  const template_ids = template_instances
    .map(t => t.template)

  const templates = await Template.getAll(template_ids)
  const indexed_templates = _.keyBy(templates, 'id')

  campaigns.forEach((campaign, i) => {
    if (!campaign.template)
      return

    const instance = indexed_instances[campaign.template]
    const template = indexed_templates[instance.template]

    const { html } = instance
    const { mjml } = template

    campaign.html = mjml ? mjml2html(html).html : html
  })

  const ids = await insert(campaigns)

  campaigns.forEach((campaign, i) => {
    campaign.id = ids[i]
  })

  await EmailCampaignRecipient.insertForCampaigns(campaigns)

  await insertAttachments(/** @type {IEmailCampaign[]} */(campaigns))

  EmailCampaign.notify(
    EmailCampaign.CREATE_EVENT,
    campaigns[0].created_by,
    campaigns[0].brand,
    ids
  )

  return ids
}

/**
 * @param {IEmailCampaign} campaign
 */
EmailCampaign.update = async campaign => {
  const text = campaign.text || htmlToText(campaign.html)

  await validate(campaign)

  await db.query.promise('email/campaign/update', [
    campaign.id,
    campaign.subject,
    campaign.include_signature,
    campaign.html,
    text,
    campaign.due_at
  ])

  await EmailCampaignRecipient.insertForCampaigns([campaign])

  const old = await EmailCampaign.get(campaign.id)
  const attachments = old.attachments || []

  const toDelete = attachments.map(file => {
    return {
      file,
      role_id: campaign.id,
      role: 'EmailCampaign'
    }
  })
  await AttachedFile.unlinkMany(toDelete)

  await insertAttachments([campaign])

  return EmailCampaign.get(campaign.id)
}

EmailCampaign.deleteMany = async (ids, user, brand) => {
  await db.update('email/campaign/delete', [
    ids
  ])

  EmailCampaign.notify(
    EmailCampaign.DELETE_EVENT,
    user.id,
    brand,
    ids
  )
}

EmailCampaign.sendDue = async () => {
  const due = await db.selectIds('email/campaign/due')

  const campaigns = await EmailCampaign.getAll(due)

  for(const campaign of campaigns)
    await EmailCampaign.send(campaign)
}

/**
 * @param {IEmailCampaign} campaign
 */
EmailCampaign.send = async (campaign) => {
  Context.log('Sending', campaign.id)

  const recipients = await db.select('email/campaign/emails', [campaign.id])
  const user       = await User.get(campaign.from)
  const text       = campaign.text || htmlToText(campaign.html)

  const attachments = await EmailCampaignAttachment.getByCampaign(campaign.id)

  const ids   = attachments.map(att => att.file)
  const files = await AttachedFile.getAll(ids)

  const filesById = _.keyBy(files, 'id')

  const populated = attachments.map(attachment => {
    return {
      ...attachment,
      ...filesById[attachment.file]
    }
  })

  const email = {
    domain: Email.MARKETING,
    from: `${user.display_name} <${user.email}>`,
    subject: campaign.subject,
    html: campaign.html,
    text,
    campaign: campaign.id,
    user: campaign.created_by,
    attachments: populated,
    headers: campaign.headers,
    google_credential: campaign.google_credential,
    microsoft_credential: campaign.microsoft_credential,
    tracking_id: uuid.v4()
  }

  markAsExecuted(campaign.id)

  if (campaign.individual)
    await sendIndividualCampaign({campaign, recipients, email, user})
  else
    await sendCampaign({campaign, recipients, email, user})

  EmailCampaign.notify(
    EmailCampaign.SEND_EVENT,
    user.id,
    campaign.brand,
    [campaign.id]
  )
}



Orm.register('email_campaign', 'EmailCampaign', EmailCampaign)

EmailCampaign.associations = {
  emails: {
    collection: true,
    model: 'EmailCampaignEmail',
    enabled: false,
  },

  template: {
    model: 'TemplateInstance',
    enabled: false
  },

  from: {
    model: 'User',
    enabled: false
  },

  recipients: {
    model: 'EmailCampaignRecipient',
    collection: true,
    enabled: false
  },

  deal: {
    model: 'Deal',
    enabled: false,
    optional: true
  },

  attachments: {
    model: 'EmailCampaignAttachment',
    enabled: false,
    collection: true
  }
}

module.exports = EmailCampaign
