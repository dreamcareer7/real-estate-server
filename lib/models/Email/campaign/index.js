const { EventEmitter } = require('events')

const _ = require('lodash')

const db = require('../../../utils/db')

const ContactEmail = require('../../Contact/email')
const Task = require('../../CRM/Task')

const AttachedFile = require('../../AttachedFile')
const Orm = require('../../Orm')
const User = require('../../User')

const Email = require('../index')
const EmailCampaign = {}

global['EmailCampaign'] = EmailCampaign

const EmailCampaignEmail = require('./email')
const EmailCampaignRecipient = require('./recipient')

const default_event_title = '(untitled email)'
const emitter = new EventEmitter()

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
  return db.selectIds('email/campaign/insert', [JSON.stringify(campaigns)])
}

/**
 * @param {IEmailCampaign[]} campaigns 
 */
const insertAttachments = async campaigns => {
  const links = []

  for(const campaign of campaigns) {
    const { attachments = [] } = campaign

    for(const attachment of attachments)
      links.push({
        role: 'EmailCampaign',
        role_id: campaign.id,
        file: attachment
      })
  }

  await AttachedFile.linkMany(links)
}

/**
 * @param {IEmailCampaignInput[]} campaigns
 */
EmailCampaign.createMany = async (campaigns) => {
  const ids = await insert(campaigns)

  campaigns.forEach((campaign, i) => {
    campaign.id = ids[i]
  })

  await EmailCampaignRecipient.insertForCampaigns(campaigns)

  await insertAttachments(/** @type {IEmailCampaign[]} */(campaigns))

  emitter.emit('create', { ids, user: campaigns[0].created_by, brand: campaigns[0].brand })

  return ids
}

/**
 * @param {IEmailCampaign} campaign
 */
EmailCampaign.update = async campaign => {
  await db.query.promise('email/campaign/update', [
    campaign.id,
    campaign.subject,
    campaign.include_signature,
    campaign.html,
    campaign.due_at
  ])

  await EmailCampaignRecipient.insertForCampaigns([campaign])

  return EmailCampaign.get(campaign.id)
}

EmailCampaign.sendDue = async () => {
  const rows = await db.select('email/campaign/due')

  const due = rows.map(r => r.id)

  const campaigns = await EmailCampaign.getAll(due)

  for(const campaign of campaigns)
    await EmailCampaign.send(campaign)
}

const sendIndividualCampaign = async ({email, recipients = [], campaign}) => {
  const emails = recipients.map(recipient => {
    return {
      ...email,
      to: [recipient.email]
    }
  })


  const saved = await Email.createAll(emails)

  const campaign_emails = recipients.map((to, i) => {
    return {
      ...to,
      email: saved[i],
      campaign: campaign.id
    }
  })

  await EmailCampaignEmail.createAll(campaign_emails)

  const contact_emails = recipients
    .filter((ce, i) => ce.contact)
    .map((ce, i) => {
      return {
        user: campaign.from,
        contact: ce.contact,
        email: saved[i]
      }
    })

  await ContactEmail.createAll(contact_emails)

  /** @type {ICrmAssociationInput[]} */
  const associations = contact_emails.map(/** @returns {ICrmAssociationInputContact} */ce => {
    return {
      association_type: 'contact',
      contact: ce.contact,
      brand: campaign.brand,
      created_by: campaign.created_by
    }
  })

  associations.push({
    association_type: 'email',
    email: campaign.id,
    brand: campaign.brand,
    created_by: campaign.created_by
  })

  if (campaign.deal) {
    associations.push({
      association_type: 'deal',
      deal: campaign.deal,
      brand: campaign.brand,
      created_by: campaign.created_by
    })
  }

  await Task.create({
    created_by: campaign.from,
    brand: campaign.brand,
    title: campaign.subject || default_event_title,
    status: 'DONE',
    task_type: 'Email',
    due_date: Date.now() / 1000,
    associations,
    assignees: [campaign.from]
  })
}

const sendCampaign = async ({email, recipients = [], campaign}) => {
  const grouped = _.groupBy(recipients, 'recipient_type')

  email.to = _.map(grouped.To, 'email')
  email.cc = _.map(grouped.CC, 'email')
  email.bcc = _.map(grouped.BCC, 'email')

  const saved = await Email.create(email)

  const campaign_emails = recipients.map(to => {
    return {
      ...to,
      email: saved.id,
      campaign: campaign.id
    }
  })

  EmailCampaignEmail.createAll(campaign_emails)

  const contact_emails = recipients
    .filter(ce => ce.contact)
    .map(ce => {
      return {
        user: campaign.from,
        contact: ce.contact,
        email: saved.id
      }
    })

  await ContactEmail.createAll(contact_emails)

  /** @type {ICrmAssociationInput[]} */
  const associations = contact_emails.map(/** @returns {ICrmAssociationInputContact} */ce => {
    return {
      association_type: 'contact',
      contact: ce.contact,
      brand: campaign.brand,
      created_by: campaign.created_by
    }
  })

  associations.push({
    association_type: 'email',
    email: campaign.id,
    brand: campaign.brand,
    created_by: campaign.created_by
  })

  if (campaign.deal) {
    associations.push({
      association_type: 'deal',
      deal: campaign.deal,
      brand: campaign.brand,
      created_by: campaign.created_by
    })
  }

  await Task.create({
    created_by: campaign.from,
    brand: campaign.brand,
    title: campaign.subject || default_event_title,
    status: 'DONE',
    task_type: 'Email',
    due_date: Date.now() / 1000,
    associations,
    assignees: [campaign.from]
  })
}

/**
 * @param {IEmailCampaign} campaign
 */
EmailCampaign.send = async (campaign) => {
  const recipients = await db.select('email/campaign/emails', [campaign.id])

  const user = await User.get(campaign.from)

  const email = {
    domain: Email.MARKETING,
    from: `${user.display_name} <${user.email}>`,
    subject: campaign.subject,
    html: campaign.html,
    campaign: campaign.id,
    attachments: campaign.attachments || []
  }

  markAsExecuted(campaign.id)

  if (campaign.individual)
    return sendIndividualCampaign({campaign, recipients, email})

  return sendCampaign({campaign, recipients, email})
}

EmailCampaign.on = emitter.on.bind(emitter)

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
  }
}

module.exports = EmailCampaign
