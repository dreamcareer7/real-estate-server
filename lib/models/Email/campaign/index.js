const { EventEmitter } = require('events')

const _ = require('lodash')
const mjml2html = require('mjml')

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

/**
 * @param {UUID} id 
 */
const markAsExecuted = async id => {
  await db.query.promise('email/campaign/mark-as-executed', [id])
}

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

/**
 * @param {IEmailCampaign[]} campaigns 
 */
const insertAttachments = async (campaigns) => {
  const attachments = []

  for(const campaign of campaigns) {
    if (campaign.attachments) {
      for (const attachment of campaign.attachments) {
        attachments.push({
          'email_campaign': campaign.id,
          'file': attachment.file,
          'is_inline': attachment.is_inline,
          'content_id': attachment.content_id,
        })
      }
    }
  }

  return await EmailCampaignAttachment.createAll(attachments)
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
 * @typedef IEmailForRender
 * @property {string} subject
 * @property {string} text
 * @property {string} html
 */

/**
 * @param {{ email: IEmailForRender; user?: IUser; contact?: IContact }} param0 
 */
const renderSubject = ({email, user, contact}) => {
  const { subject = '' } = email

  return render.isolated.textString(subject, {
    recipient: contact,
    sender: user
  })
}

/**
 * @param {{ email: IEmailForRender; user?: IUser; contact?: IContact }} param0 
 */
const renderHtmlBody = ({email, user, contact}) => {
  const { html = '' } = email

  return render.isolated.htmlString(html, {
    recipient: contact,
    sender: user
  })
}

/**
 * @param {{ email: IEmailForRender; user?: IUser; contact?: IContact }} param0 
 */
const renderTextBody = ({email, user, contact}) => {
  const { text = '' } = email

  return render.isolated.textString(text, {
    recipient: contact,
    sender: user
  })
}

const sendIndividualCampaign = async ({email, recipients = [], campaign, user}) => {
  const contact_ids = recipients
    .map(r => r.contact)
    .filter(Boolean)


  const contacts = await Contact.getAll(contact_ids)
  const indexed = _.keyBy(contacts, 'id')

  const renderer = async recipient => {
    const contact = indexed[recipient.contact] || {
      email: recipient.email
    }

    const promises = [
      renderSubject({email, contact, user}),
      renderHtmlBody({email, contact, user}),
      renderTextBody({email, contact, user})
    ]

    const results = await Promise.all(promises)

    const [
      subject,
      html,
      text
    ] = results

    return {
      ...email,
      subject,
      html,
      text,
      tags: [campaign.brand],
      to: [recipient.email]
    }
  }

  const renderAll = () => {
    const promises = recipients.map(renderer)

    const results = Promise.all(promises)
    return results
  }

  const emails = await renderAll()  
  const saved  = await Email.createAll(emails)

  Context.log(`Rendering is completed for ${emails.length} `)

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
  const {
    contact: contact_id
  } = grouped.To[0]

  const contact = contact_id ? (await Contact.get(contact_id)) : null

  const promises = [
    renderSubject({email, contact, user}),
    renderHtmlBody({email, contact, user}),
    renderTextBody({email, contact, user}),
  ]

  const results = await Promise.all(promises)

  const [
    subject,
    html,
    text
  ] = results

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
    microsoft_credential: campaign.microsoft_credential
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

Orm.register('email_campaign', 'EmailCampaign', EmailCampaign)

const validate = async campaign => {
  const { html, text, subject } = campaign

  const email = {
    subject, html, text
  }

  try {
    await renderSubject({email})
  } catch(e) {
    console.log(e)
    throw Error.Validation('Error in formatting of subject')
  }

  try {
    await renderHtmlBody({email})
  } catch(e) {
    console.error(e)
    throw Error.Validation('Error in formatting of body')
  }

  try {
    await renderTextBody({email})
  } catch(e) {
    console.error(e)
    throw Error.Validation('Error in formatting of text body')
  }
}

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
    model: 'AttachedFile',
    enabled: false,
    collection: true
  }
}

module.exports = EmailCampaign
