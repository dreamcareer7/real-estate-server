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

require('./email')

const default_event_title = '(untitled email)'

EmailCampaign.getAll = async ids => {
  const associations = Orm.getEnabledAssociations()
  const conditions = Orm.getAssociationConditions('email_campaign.emails')

  return db.select('email/campaign/get', [ids, associations, conditions ? conditions.contact : null])
}

EmailCampaign.get = async id => {
  const campaigns = await EmailCampaign.getAll([id])


  if (campaigns.length < 1)
    throw Error.ResourceNotFound(`Email Campaign ${id} not found`)

  return campaigns[0]
}

EmailCampaign.getByBrand = async brand => {
  const ids = await db.selectIds('email/campaign/by_brand', [brand])

  return EmailCampaign.getAll(ids)
}

const markAsExecuted = async id => {
  await db.query.promise('email/campaign/mark-as-executed', [id])
}

const insert = async campaigns => {
  return db.selectIds('email/campaign/insert', [JSON.stringify(campaigns)])
}

const insertRecipients = async (/** @type {IEmailCampaign[]} */campaigns) => {
  const recipients = []

  for(const campaign of campaigns) {
    const {
      to = [],
      cc = [],
      bcc = []
    } = campaign

    for(const recipient of to) {
      recipients.push({
        campaign: campaign.id,
        tag: /**     @type {IEmailRecipientTagInput}   */ (recipient).tag,
        list: /**    @type {IEmailRecipientListInput}  */ (recipient).list,
        contact: /** @type {IEmailRecipientEmailInput} */ (recipient).contact,
        email: /**   @type {IEmailRecipientEmailInput} */ (recipient).email,
        recipient_type: Email.TO
      })
    }

    for(const recipient of cc) {
      recipients.push({
        campaign: campaign.id,
        tag: /**     @type {IEmailRecipientTagInput}   */ (recipient).tag,
        list: /**    @type {IEmailRecipientListInput}  */ (recipient).list,
        contact: /** @type {IEmailRecipientEmailInput} */ (recipient).contact,
        email: /**   @type {IEmailRecipientEmailInput} */ (recipient).email,
        recipient_type: Email.CC
      })
    }

    for(const recipient of bcc) {
      recipients.push({
        campaign: campaign.id,
        tag: /**     @type {IEmailRecipientTagInput}   */ (recipient).tag,
        list: /**    @type {IEmailRecipientListInput}  */ (recipient).list,
        contact: /** @type {IEmailRecipientEmailInput} */ (recipient).contact,
        email: /**   @type {IEmailRecipientEmailInput} */ (recipient).email,
        recipient_type: Email.BCC
      })
    }
  }

  await db.query.promise('email/campaign/insert-recipients', [JSON.stringify(recipients)])
}

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

EmailCampaign.createMany = async (/** @type {IEmailCampaign[]} */campaigns) => {
  const ids = await insert(campaigns)

  campaigns.forEach((campaign, i) => {
    campaign.id = ids[i]
  })

  await insertRecipients(campaigns)

  await insertAttachments(campaigns)

  return ids
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

Orm.register('email_campaign', 'EmailCampaign', EmailCampaign)

EmailCampaign.associations = {
  emails: {
    collection: true,
    model: 'EmailCampaignEmail',
    enabled: false,
  }
}

module.exports = EmailCampaign
