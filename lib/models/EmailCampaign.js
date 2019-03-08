const db = require('../utils/db')
const promisify = require('../utils/promisify')

const ContactEmail = require('./Contact/email')
const Task = require('./CRM/Task')

EmailCampaign = {}

EmailCampaign.getAll = async ids => {
  return db.select('email/campaign/get', [ids])
}

EmailCampaign.get = async id => {
  const campaigns = await EmailCampaign.getAll([id])

  if (campaigns.length < 1)
    throw Error.ResourceNotFound(`Email Campaign ${id} not found`)

  return campaigns[0]
}

const insert = async campaign => {
  const { rows } = await db.query.promise('email/campaign/insert', [
    campaign.due_at,
    campaign.created_by,
    campaign.from,
    campaign.brand,
    campaign.subject,
    campaign.include_signature || false,
    campaign.html
  ])

  return rows[0].id
}

const insertRecipient = async (campaign, recipient) => {
  await db.query.promise('email/campaign/insert-recipient', [
    campaign,
    recipient.tag,
    recipient.list,
    recipient.contact,
    recipient.email,
  ])
}

EmailCampaign.create = async (campaign, brand_id) => {
  const campaign_id = await insert(campaign)

  const { to, attachments = [] } = campaign

  for(const recipient of to)
    await insertRecipient(campaign_id, recipient)

  for(const attachment of attachments)
    await promisify(AttachedFile.link)(attachment, {
      role: 'EmailCampaign',
      role_id: campaign_id
    })

  return EmailCampaign.get(campaign_id)
}

EmailCampaign.sendDue = async () => {
  const rows = await db.select('email/campaign/due')

  const due = rows.map(r => r.id)

  const campaigns = await EmailCampaign.getAll(due)

  for(const campaign of campaigns)
    await EmailCampaign.send(campaign)
}

EmailCampaign.send = async campaign => {
  const rows = await db.select('email/campaign/emails', [campaign.id])

  const user = await User.get(campaign.from)

  const emails = rows.map(row => {
    return {
      domain: Email.MARKETING,
      to: row.email,
      from: `${user.display_name} <${user.email}>`,
      subject: campaign.subject,
      html: campaign.html,
      campaign: campaign.id,
      attahments: campaign.attachments
    }
  })

  const email_ids = await Email.createAll(emails)

  const contact_emails = rows
    .filter(ce => ce.contact)
    .map((ce, i) => {
      return {
        user: campaign.from,
        contact: ce.contact,
        email: email_ids[i]
      }
    })

  await ContactEmail.createAll(contact_emails)

  const associations = contact_emails.map(ce => {
    return {
      association_type: 'contact',
      contact: ce.contact
    }
  })

  if (associations.length < 1)
    return

  await Task.create({
    title: campaign.subject,
    status: 'DONE',
    task_type: 'Email',
    due_date: Date.now() / 1000,
    associations,
    assignees: [campaign.from]
  }, campaign.from, campaign.brand)
}

Orm.register('email_campaign', 'EmailCampaign', EmailCampaign)

module.exports = EmailCampaign
