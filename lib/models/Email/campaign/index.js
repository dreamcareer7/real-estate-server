const { EventEmitter } = require('events')

const config = require('../../../config')
const _ = require('lodash')
const mjml2html = require('mjml')
const uuid = require('uuid')
const promisify = require('util').promisify

const expect = require('../../../utils/validator').expect
const db     = require('../../../utils/db')
const squel  = require('../../../utils/squel_extensions')

const AttachedFile = require('../../AttachedFile')
const Context = require('../../Context')
const Socket = require('../../Socket')
const User = require('../../User/get')
const Contact = require('../../Contact')
const Crypto = require('../../Crypto')
const Template = require('../../Template')
const TemplateInstance = require('../../Template/instance')
const htmlToText = require('../html-to-text')
const Orm = {
  ...require('../../Orm/registry'),
  ...require('../../Orm/context'),
}

const MicrosoftCredential = require('../../Microsoft/credential')
const MicrosoftMessage = require('../../Microsoft/message')
const GoogleCredential = require('../../Google/credential')
const GoogleMessage = require('../../Google/message')

const EmailCampaign = {}
const emitter = new EventEmitter
EmailCampaign.on = emitter.on.bind(emitter)

const EmailCampaignEmail = require('./email')
const EmailCampaignRecipient = require('./recipient')
const EmailCampaignAttachment = require('./attachments')

EmailCampaign.CREATE_EVENT = 'email_campaign:create'
EmailCampaign.SEND_EVENT = 'email_campaign:send'
EmailCampaign.DELETE_EVENT = 'email_campaign:delete'
EmailCampaign.STATS_EVENT = 'email_campaign:stats'
EmailCampaign.FAIL_EVENT = 'email_campaign:fail'

const regexp = /{{\s*((recipient|sender)+)\.([\w]+)\s*(or\s*"(.*)")*\s*}}/gi

const { create, createAll } = require('../create')
const { MARKETING } = require('../constants')

const { saveThreadKey } = require('./save')

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

const validateAttachmentsSize = async (ids, limit) => {
  const limitMsg = `${Math.round(limit / (1024 * 1024))}MB`

  const files = await AttachedFile.getAll(ids)
  
  if (files.length === 0) {
    return
  }

  const promises = []

  for (const file of files) {
    promises.push(AttachedFile.getFileSize(file))
  }

  let sizeSum = 0

  const result = await Promise.all(promises)

  for (const size of result) {
    const base64Size = ((size + 3 - 1) / 3) * 4

    if ( base64Size > limit ) {
      throw Error.BadRequest(`File size could not be greater than ${limitMsg}!`)
    }

    sizeSum += base64Size
  }

  if ( sizeSum > limit ) {
    throw Error.BadRequest(`Files size could not be greater than ${limitMsg}!`)
  }
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
      const viaMicrosoft = Boolean(campaign.microsoft_credential) 
      const viaGoogle    = Boolean(campaign.google_credential)

      const fileAtts   = handleFileAttachments(campaign)
      const remtoeAtts = await handleRemoteAttachments(campaign)
      
      ids         = ids.concat(fileAtts.ids, remtoeAtts.ids)
      attachments = attachments.concat(fileAtts.attachments, remtoeAtts.attachments)

      let limit = config.mailgun_integration.attachment_size_limit
      if (viaGoogle) limit = config.google_integration.attachment_size_limit
      if (viaMicrosoft) limit = config.microsoft_integration.attachment_size_limit

      await validateAttachmentsSize(ids, limit)
    }
  }

  return await EmailCampaignAttachment.createAll(attachments)
}

const render = (template, entities) => {
  const matches = template.matchAll(regexp)

  for(const match of matches) {
    const [
      text,
      entity,,
      attribute,,
      default_value
    ] = match

    const model = entities[entity.toLowerCase()]

    const value = model && model[attribute] ? model[attribute] : default_value

    template = template.replace(text, value)
  }

  return template
}

const sendIndividualCampaign = async ({email, recipients = [], campaign, user}) => {
  Context.log('Sending individual campaign', campaign.id)

  const max_allowed = user.email_quota
  const used_quota = await EmailCampaign.checkQuota(campaign.brand, user.id)

  if (used_quota + recipients.length > max_allowed) {
    Context.log(`used_quota: ${used_quota}, recipients: ${recipients.length}, max_allowed: ${max_allowed}`)
    throw new Error('Maximum marketing email quota per month exceeded.')
  }

  const contact_ids = recipients
    .map(r => r.contact)
    .filter(Boolean)


  const contacts = await Contact.getAll(contact_ids)
  const indexed = _.keyBy(contacts, 'id')

  const renderer = recipient => {
    const contact = indexed[recipient.contact] || {
      email: recipient.email
    }

    const subject = render(email.subject, {
      recipient: contact,
      sender: user
    })

    const text = render(email.text, {
      recipient: contact,
      sender: user
    })

    const html = render(email.html, {
      recipient: contact,
      sender: user
    })

    return {
      ...email,
      subject,
      html,
      text,
      tags: [campaign.brand, campaign.id],
      to: [recipient.email]
    }
  }

  const emails = recipients.map(renderer)

  Context.log(`Rendering is completed for campaign ${campaign.id}, resulting in ${emails.length} emails.`)

  const saved = await createAll(emails)
  Context.log(`Scheduled ${emails.length} emails.`)

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

  Context.log(`Finished sending campaign ${campaign.id}.`)
}

const sendCampaign = async ({email, recipients = [], campaign, user}) => {
  const grouped = _.groupBy(recipients, 'send_type')

  email.to = _.map(grouped.To, 'email')
  email.cc = _.map(grouped.CC, 'email')
  email.bcc = _.map(grouped.BCC, 'email')
  email.tags = [campaign.brand, campaign.id]

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

  const contact_id = primaryRecpient ? primaryRecpient.contact : null

  const contact = contact_id ? (await Contact.get(contact_id)) : null

  const subject = render(email.subject, {
    recipient: contact,
    sender: user
  })

  const text = render(email.text, {
    recipient: contact,
    sender: user
  })

  const html = render(email.html, {
    recipient: contact,
    sender: user
  })

  const saved = await create({
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

const validateCredential = async (campaign, viaMicrosoft, viaGoogle) => {
  if ( !viaMicrosoft && !viaMicrosoft ) {
    return
  }

  let credential

  if (viaMicrosoft) {
    credential = await MicrosoftCredential.hasSendEmailAccess(campaign.microsoft_credential)
  }

  if (viaGoogle) {
    credential = await GoogleCredential.hasSendEmailAccess(campaign.google_credential)
  }

  if (credential && (credential.user !== campaign.from)) {
    throw Error.Validation('Sender is not allowed to send email on behalf of the connected account!')  
  }

  // Disabled due to issue: https://gitlab.com/rechat/server/-/issues/1576
  // if ( credential && credential.user !== campaign.from ) {
  //   throw Error.Validation('Invalid user!')
  // }

  if ( credential &&  credential.revoked ) {
    throw Error.Validation('Credential is revoked!')
  }

  if ( credential &&  credential.deleted_at ) {
    throw Error.Validation('Credential is deleted!')
  }
}

const validateAttachments = (campaign, viaMailgun) => {
  if (!campaign.attachments) {
    return
  }

  for (const attachment of campaign.attachments) {
    expect(Boolean(!attachment.file) && Boolean(!attachment.url), 'Attachment\'s file or url is missed!').to.equal(false)
    expect(Boolean(attachment.file) && Boolean(attachment.url), 'It is not allowed to send both attachments\'s file and url').to.equal(false)

    if ( !attachment.file && attachment.url ) {
      if (!attachment.name) {
        throw Error.Validation('Attachment\'s name is missed!')
      }
    }

    if (viaMailgun) {
      return
    }

    if (!attachment.is_inline) {
      return
    }

    if (!attachment.content_id) {
      throw Error.Validation('Attachment\'s content-id is missed!')
    }

    return
  }
}

const validate = async campaign => {
  if ( campaign.google_credential && campaign.microsoft_credential ) {
    throw Error.Validation('It is not allowed to send both google and microsoft ceredentials.')
  }

  const viaMicrosoft = Boolean(campaign.microsoft_credential) 
  const viaGoogle    = Boolean(campaign.google_credential)
  const viaMailgun   = !viaMicrosoft && !viaGoogle

  await validateCredential(campaign, viaMicrosoft, viaGoogle)
  validateAttachments(campaign, viaMailgun)

  if (viaMailgun) {
    campaign.headers = {}
  }

  return
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
  const { contact, limit } = conditions || { limit: 7000 }

  return db.select('email/campaign/get', [ids, associations, contact, limit])
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

EmailCampaign.getByUser = async (user, from, to) => {
  const ids = await db.selectIds('email/campaign/by_user', [user, from, to])

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

    const options = {
      minify: true // Due to templates#188 and https://github.com/mjmlio/mjml/issues/490
    }

    campaign.html = mjml ? mjml2html(html, options).html : html
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
    campaign.from,
    campaign.subject,
    campaign.include_signature,
    campaign.html,
    text,
    campaign.due_at,
    campaign.google_credential,
    campaign.microsoft_credential
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
  await EmailCampaignAttachment.deleteByCampaign(campaign.id)

  const hasAttachments = campaign.attachments ? ( campaign.attachments.length > 0 ? true : false ) : false

  if (hasAttachments)
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

/**
 * @param {UUID} brand_id 
 * @param {UUID} user_id 
 */
EmailCampaign.checkQuota = async (brand_id, user_id) => {
  const res = await db.selectOne('email/campaign/check_quota', [
    brand_id,
    user_id
  ])

  return parseInt(res.count)
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
    domain: MARKETING,
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

  await markAsExecuted(campaign.id)

  try {

    // individual campaign ==> marketing-center
    // normal campaign     ==> insigtht, contact-profile, inbox

    // outlook => 30 messages per minute
    // gmail   => 2000 daily

    // outlook recipients limit per message: 500
    // gmail recipients limit per message: 100
    // gmail and outlook daily recipients: 10,000

    const rlen = recipients.length
    const isGoogle    = campaign.google_credential ? true : false
    const isMicrosoft = campaign.microsoft_credential ? true : false

    if ( campaign.individual ) {

      campaign.headers = {}
      campaign.microsoft_credential = ''
      campaign.google_credential    = ''
      email.microsoft_credential    = ''
      email.google_credential       = ''

      await sendIndividualCampaign({campaign, recipients, email, user})

    } else {

      if ( (isGoogle && rlen > 100) || (isMicrosoft && rlen > 500) ) {
        campaign.headers = {}
        campaign.microsoft_credential = ''
        campaign.google_credential    = ''
        email.microsoft_credential    = ''
        email.google_credential       = ''
      }      

      if (rlen < 1000) {
        await sendCampaign({campaign, recipients, email, user})

      } else {

        // If campaign's gateway was either of Google or Microsoft, It would be switched to Mailgun due of lines 746-752
        await sendIndividualCampaign({campaign, recipients, email, user})
      }
    }

  } catch(error) {
    Context.log('Error during email send', error)
    await EmailCampaign.saveError(campaign, error.message)

    EmailCampaign.notify(
      EmailCampaign.FAIL_EVENT,
      user.id,
      campaign.brand,
      [campaign.id]
    )
  }

  EmailCampaign.notify(
    EmailCampaign.SEND_EVENT,
    user.id,
    campaign.brand,
    [campaign.id]
  )
}

/**
 * @param {Object} campaign
 * @param {string} error
 */
EmailCampaign.saveError = async (campaign, error) => {
  return db.query.promise('email/campaign/save-error', [campaign.id, Context.getId(), error])
}

/**
 * @param {UUID} id
 * @param {string} key
 */
EmailCampaign.saveThreadKey = saveThreadKey

EmailCampaign.saveThreadKeys = async (records) => {
  if (records.length === 0) {
    return []
  }

  return await db.chunked(records, Object.keys(records[0]).length, (chunk, i) => {
    const q = squel
      .update()
      .withValues('update_values', chunk)
      .table('email_campaigns', 'ec')
      .set('thread_key = uv.thread_key')
      .from('update_values', 'uv')
      .where('ec.id = uv.id::uuid')

    q.name = 'email/campaign/save_thread_keys'

    return db.update(q, [])
  })  
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
    model(c, cb) {
      if (c.google_credential) return cb(null, 'GoogleCredential')
      if (c.microsoft_credential) return cb(null, 'MicrosoftCredential')
      return cb(null, 'User')
    },
    id(c, cb) {
      if (c.google_credential) return cb(null, c.google_credential)
      if (c.microsoft_credential) return cb(null, c.microsoft_credential)
      return cb(null, c.from)
    },
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