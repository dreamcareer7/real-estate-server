const db = require('../../utils/db')
const promisify = require('../../utils/promisify')

const ContactEmail = require('../Contact/email')
const Task = require('../CRM/Task')

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

const markAsExecuted = async id => {
  await db.query.promise('email/campaign/mark-as-executed', [id])
}

const insert = async campaigns => {
  const { rows } = await db.query.promise('email/campaign/insert', [JSON.stringify(campaigns)])

  return rows.map(r => r.id)
}

const insertRecipients = async (campaigns) => {
  const recipients = []

  for(const campaign of campaigns) {
    const { to } = campaign

    for(const recipient of to)
      recipients.push({
        campaign: campaign.id,
        tag: recipient.tag,
        list: recipient.list,
        contact: recipient.contact,
        email: recipient.email
      })

  }

  await db.query.promise('email/campaign/insert-recipients', [JSON.stringify(recipients)])
}

EmailCampaign.createMany = async (campaigns) => {
  const ids = await insert(campaigns)

  campaigns.forEach((campaign, i) => {
    campaign.id = ids[i]
  })

  await insertRecipients(campaigns)

  for(const campaign of campaigns) {
    const { attachments = [] } = campaign

    for(const attachment of attachments)
      await promisify(AttachedFile.link)(attachment, {
        role: 'EmailCampaign',
        id: campaign.id
      })
  }

  return ids
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
      attachments: campaign.attachments || []
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

  markAsExecuted(campaign.id)

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
