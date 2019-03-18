const _ = require('lodash')

const db = require('../../utils/db')

const ContactEmail = require('../Contact/email')
const Task = require('../CRM/Task')

const AttachedFile = require('../AttachedFile')
const Orm = require('../Orm')
const User = require('../User')

const Email = require('./index')
const EmailCampaign = {}

global['EmailCampaign'] = EmailCampaign

EmailCampaign.getAll = async ids => {
  return db.select('email/campaign/get', [ids])
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

const sendIndividuakCampaign = async ({email, recipients, campaign}) => {
  const emails = recipients.To.map(to => {
    return {
      ...email,
      to
    }
  })

  const saved = await Email.createMany(emails)

  const contact_emails = recipients
    .filter((ce, i) => ce.contact)
    .map((ce, i) => {
      return {
        user: campaign.from,
        contact: ce.contact,
        email: saved[i].id
      }
    })


  await ContactEmail.createAll(contact_emails)

  const associations = contact_emails.map(/** @returns {ICrmAssociationInputContact} */ce => {
    return {
      association_type: 'contact',
      contact: ce.contact,
      brand: campaign.brand,
      created_by: campaign.created_by
    }
  })

  if (associations.length < 1)
    return

  await Task.create({
    created_by: campaign.from,
    brand: campaign.brand,
    title: campaign.subject,
    status: 'DONE',
    task_type: 'Email',
    due_date: Date.now() / 1000,
    associations,
    assignees: [campaign.from]
  })
}

const sendCampaign = async ({email, recipients, campaign}) => {

  email.to = _.map(recipients.To, 'email')
  email.cc = _.map(recipients.CC, 'email')
  email.bcc = _.map(recipients.BCC, 'email')

  const saved = await Email.create(email)

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

  const associations = contact_emails.map(/** @returns {ICrmAssociationInputContact} */ce => {
    return {
      association_type: 'contact',
      contact: ce.contact,
      brand: campaign.brand,
      created_by: campaign.created_by
    }
  })

  if (associations.length < 1)
    return

  await Task.create({
    created_by: campaign.from,
    brand: campaign.brand,
    title: campaign.subject,
    status: 'DONE',
    task_type: 'Email',
    due_date: Date.now() / 1000,
    associations,
    assignees: [campaign.from]
  })
}

EmailCampaign.send = async (/** @type {IEmailCampaign} */campaign) => {
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
    return sendIndividuakCampaign({campaign, recipients, email})

  return sendCampaign({campaign, recipients, email})
}

Orm.register('email_campaign', 'EmailCampaign', EmailCampaign)

module.exports = EmailCampaign