const fs   = require('fs')
const path = require('path')
const { expect } = require('chai')

const { createContext, handleJobs } = require('../helper')

const db      = require('../../../lib/utils/db')
const sql     = require('../../../lib/utils/sql')
const config  = require('../../../lib/config')
const Contact = require('../../../lib/models/Contact/manipulate')
const Context = require('../../../lib/models/Context')
const User    = require('../../../lib/models/User/get')
const EmailCampaign = require('../../../lib/models/Email/campaign')
const EmailCampaignAttachment = require('../../../lib/models/Email/campaign/attachment')
const EmailCampaignEmail = require('../../../lib/models/Email/campaign/email')
const AttachedFile = require('../../../lib/models/AttachedFile')

const Email   = {
  ...require('../../../lib/models/Email/constants'),
  ...require('../../../lib/models/Email/create'),
}

const googleToRecipients = [
  {
    email: 'gholi@rechat.com',
    recipient_type: Email.EMAIL
  }
]

const microsoftToRecipients = [
  {
    email: 'gholi@rechat.com',
    recipient_type: Email.EMAIL
  },
  {
    email: 'jefri@rechat.com',
    recipient_type: Email.EMAIL
  }
]

const BrandHelper    = require('../brand/helper')
const { attributes } = require('../contact/helper')

const { createGoogleCredential }    = require('../google/helper')
const { createMicrosoftCredential } = require('../microsoft/helper')

let userA, userB, brand1, brand2


async function setup() {
  userA = await User.getByEmail('test@rechat.com')
  userB = await User.getByEmail('test+email@rechat.com')

  brand1 = await BrandHelper.create({
    roles: {
      Admin: [userA.id]
    },
    checklists: [],
    contexts: []
  })
  brand2 = await BrandHelper.create({
    roles: {
      Admin: [userB.id]
    },
    checklists: [],
    contexts: []
  })
  Context.set({ user: userA, brand: brand1 })

  await createContactForUserA()
}

async function createContactForUserA() {
  await Contact.create(
    [
      {
        user: userA.id,
        attributes: attributes({
          first_name: 'Abbas',
          email: ['abbas@rechat.com'],
          tag: ['Tag1', 'Tag4'],
          spouse_email: ['soha@gmail.com']
        })
      },
      {
        user: userA.id,
        attributes: attributes({
          first_name: 'Emil',
          email: ['emil@rechat.com'],
          tag: ['Tag2'],
          spouse_email: ['emily@gmail.com']
        })
      },
      {
        user: userA.id,
        attributes: attributes({
          first_name: 'Emil',
          last_name: 'Sedgh',
          email: ['emil@rechat.com'],
          tag: ['Tag2']
        })
      },
      {
        user: userA.id,
        attributes: attributes({
          first_name: 'Nasser',
          email: ['naser@rechat.com'],
          tag: ['Tag3']
        })
      }
    ],
    userA.id,
    brand1.id,
    'direct_request',
    { activity: false, get: false, relax: false }
  )

  await handleJobs()
}

async function createContactForUserB() {
  Context.set({ user: userB, brand: brand2 })

  await Contact.create(
    [
      {
        user: userA.id,
        attributes: [
          {
            attribute_type: 'first_name',
            text: 'Gholi'
          },
          {
            attribute_type: 'email',
            text: 'gholi@rechat.com'
          },
          {
            attribute_type: 'tag',
            text: 'Tag1'
          }
        ]
      }
    ],
    userB.id,
    brand2.id
  )

  await handleJobs()

  Context.set({ user: userA, brand: brand1 })
}

async function uploadFile() {
  return await AttachedFile.saveFromStream({
    stream: fs.createReadStream(path.resolve(__dirname, '../../functional/suites/data/contacts.csv')),
    filename: 'contacts.csv',
    user: userA,
    path: userA.id + '-' + Date.now().toString(),
    relations: [
      {
        role: 'Brand',
        role_id: brand1.id
      }
    ],
    public: true
  })
}

async function testEmailToTags() {
  /** @type {IEmailCampaignInput} */
  const campaign = {
    created_by: userA.id,
    brand: brand1.id,
    from: userA.id,
    to: [
      {
        tag: 'Tag1',
        recipient_type: Email.TAG
      },
      {
        tag: 'Tag2',
        recipient_type: Email.TAG
      }
    ],
    subject: '2',
    html: 'test',
    due_at: '2019-03-07',
    notifications_enabled: false
  }

  await EmailCampaign.createMany([campaign])

  await EmailCampaign.sendDue()
}

async function testDuplicateEmailWithTag() {
  /** @type {IEmailCampaignInput} */
  const campaign = {
    from: userA.id,
    to: [
      {
        tag: 'Tag1',
        recipient_type: Email.TAG
      },
      {
        tag: 'Tag4',
        recipient_type: Email.TAG
      },
      {
        email: 'SoHa@gmail.com',
        recipient_type: Email.EMAIL,
      }
    ],
    subject: 'testDuplicateEmail',
    html: 'test',
    brand: brand1.id,
    due_at: null,
    created_by: userA.id,
    notifications_enabled: false
  }

  const [id] = await EmailCampaign.createMany([campaign])
  const recipients = await db.select('email/campaign/emails', [id])

  expect(recipients).to.have.length(2)
  expect(recipients[0].email.toLowerCase()).to.be.equal('abbas@rechat.com')
  expect(recipients[1].email.toLowerCase()).to.be.equals('soha@gmail.com')
}

async function testCampaignToAllContacts() {
  /** @type {IEmailCampaignInput} */
  const campaign = {
    from: userA.id,
    to: [
      {
        recipient_type: Email.ALL_CONTACTS
      }
    ],
    subject: 'send to all contacts',
    html: 'test',
    brand: brand1.id,
    due_at: null,
    created_by: userA.id
  }

  const [id] = await EmailCampaign.createMany([campaign])
  const recipients = await db.select('email/campaign/emails', [id])

  expect(recipients).to.have.length(5)
  expect(recipients.map(e => e.email)).to.have.members([
    'abbas@rechat.com',
    'emil@rechat.com',
    'naser@rechat.com',
    'soha@gmail.com',
    'emily@gmail.com',
  ])
}

async function testDuplicateEmailWithEmail() {
  /** @type {IEmailCampaignInput} */
  const campaign = {
    from: userA.id,
    to: [
      {
        email: 'emil@rechat.com',
        recipient_type: Email.EMAIL
      }
    ],
    subject: 'testDuplicateEmail',
    html: 'test',
    brand: brand1.id,
    due_at: null,
    created_by: userA.id
  }

  const [id] = await EmailCampaign.createMany([campaign])
  const recipients = await db.select('email/campaign/emails', [id])

  expect(recipients).to.have.length(1)
  expect(recipients[0].email).to.be.equal('emil@rechat.com')
}

async function testEmailsOnly() {
  /** @type {IEmailCampaignInput} */
  const campaign = {
    due_at: '2019-03-07',
    from: userA.id,
    to: [
      {
        email: 'gholi@rechat.com',
        recipient_type: Email.EMAIL
      }
    ],
    subject: 'testEmailOnly',
    html: 'test',
    brand: brand1.id,
    created_by: userA.id,
    notifications_enabled: false
  }

  await EmailCampaign.createMany([campaign])

  await EmailCampaign.sendDue()
}

async function testCampaignRecipients() {
  await createContactForUserB()

  const file = await uploadFile()

  const attachmentsObj = {
    file: file.id,
    is_inline: true,
    content_id: 'content_id'
  }

  /** @type {IEmailCampaignInput} */
  const campaign = {
    due_at: '2019-03-07',
    from: userA.id,
    to: [
      {
        tag: 'Tag1',
        recipient_type: Email.TAG
      }
    ],
    subject: 'testRecipients',
    html: 'test',
    brand: brand1.id,
    created_by: userA.id,
    attachments: [attachmentsObj]
  }

  const [id] = await EmailCampaign.createMany([campaign])

  await EmailCampaign.sendDue()

  const illegal_recipients = await sql.select(`
    SELECT
      ee.id
    FROM
      email_campaign_emails AS ee
      JOIN contacts AS c
        ON ee.contact = c.id
      JOIN email_campaigns AS e
        ON ee.campaign = e.id
    WHERE
      c.brand <> e.brand
      AND e.id = $1`,
  [
    id
  ])

  expect(illegal_recipients).to.be.empty
}

async function testInsertAttachments() {
  const file = await uploadFile()

  /** @type {IEmailCampaignInput} */
  const campaignObj = {
    subject: 'Test subject',
    from: userA.id,
    to: [
      {
        email: 'gholi@rechat.com',
        recipient_type: Email.EMAIL
      }
    ],
    created_by: userA.id,
    brand: brand1.id,
    due_at: new Date().toISOString(),
    html: '<html></html>',
    notifications_enabled: false
  }

  const result = await EmailCampaign.createMany([campaignObj])
  const campaign_id = result[0]

  const input = [{
    'campaign': campaign_id,
    'file': file.id,
    'is_inline': false,
    'content_id': 'xxxzzzz',
  }]

  const ids = await EmailCampaignAttachment.createAll(input)

  expect(ids.length).to.be.equal(1)

  const attachments = await EmailCampaignAttachment.getAll(ids)

  expect(attachments.length).to.be.equal(1)
  expect(attachments[0].type).to.be.equal('email_campaign_attachment')
  expect(attachments[0].campaign).to.be.equal(input[0].campaign)
  expect(attachments[0].file).to.be.equal(input[0].file)
  expect(attachments[0].is_inline).to.be.equal(input[0].is_inline)
  expect(attachments[0].content_id).to.be.equal(input[0].content_id)
}

async function testAttachmentsGetByCampaign() {
  const file = await uploadFile()

  /** @type {IEmailCampaignInput} */
  const campaignObj = {
    subject: 'Test subject',
    from: userA.id,
    to: [
      {
        email: 'gholi@rechat.com',
        recipient_type: Email.EMAIL
      }
    ],
    created_by: userA.id,
    brand: brand1.id,
    due_at: new Date().toISOString(),
    html: '<html></html>',
    notifications_enabled: false
  }

  const result = await EmailCampaign.createMany([campaignObj])
  const campaign_id = result[0]

  const input = [{
    'campaign': campaign_id,
    'file': file.id,
    'is_inline': false,
    'content_id': 'xxxzzzz',
  }]

  await EmailCampaignAttachment.createAll(input)
  const attachments = await EmailCampaignAttachment.getByCampaign(campaign_id)

  expect(attachments.length).to.be.equal(1)
  expect(attachments[0].type).to.be.equal('email_campaign_attachment')
  expect(attachments[0].campaign).to.be.equal(input[0].campaign)
  expect(attachments[0].file).to.be.equal(input[0].file)
  expect(attachments[0].is_inline).to.be.equal(input[0].is_inline)
  expect(attachments[0].content_id).to.be.equal(input[0].content_id)
}

async function testDeleteAttachments() {
  const file = await uploadFile()

  /** @type {IEmailCampaignInput} */
  const campaignObj = {
    subject: 'Test subject',
    from: userA.id,
    to: [
      {
        email: 'gholi@rechat.com',
        recipient_type: Email.EMAIL
      }
    ],
    created_by: userA.id,
    brand: brand1.id,
    due_at: new Date().toISOString(),
    html: '<html></html>',
    notifications_enabled: false
  }

  const result = await EmailCampaign.createMany([campaignObj])
  const campaign_id = result[0]

  const input = [{
    'campaign': campaign_id,
    'file': file.id,
    'is_inline': false,
    'content_id': 'xxxzzzz',
  }]

  const ids = await EmailCampaignAttachment.createAll(input)

  expect(ids.length).to.be.equal(1)

  await EmailCampaignAttachment.deleteByCampaign(campaign_id)

  const attachments = await EmailCampaignAttachment.getByCampaign(campaign_id)

  expect(attachments.length).to.be.equal(0)
}

async function testCampaignWithAttachments() {
  const file = await uploadFile()

  const attachmentsObj = {
    file: file.id,
    is_inline: true,
    content_id: 'content_id'
  }

  /** @type {IEmailCampaignInput} */
  const campaignObj = {
    subject: 'Test subject',
    from: userA.id,
    to: [
      {
        email: 'gholi@rechat.com',
        recipient_type: Email.EMAIL
      }
    ],
    created_by: userA.id,
    brand: brand1.id,
    due_at: new Date().toISOString(),
    html: '<html></html>',
    headers: {
      message_id: 'message_id',
      in_reply_to: 'in_reply_to',
      thread_id: 'thread_id',
    },
    google_credential: null,
    microsoft_credential: null,
    attachments: [attachmentsObj],
    notifications_enabled: false
  }

  const result   = await EmailCampaign.createMany([campaignObj])
  const campaign = await EmailCampaign.get(result[0])

  expect(campaign.headers?.google_credential).to.be.equal(campaignObj.headers?.google_credential)
  expect(campaign.headers?.microsoft_credential).to.be.equal(campaignObj.headers?.microsoft_credential)

  expect(campaign.headers?.message_id).to.be.equal(campaignObj.headers?.message_id)
  expect(campaign.headers?.in_reply_to).to.be.equal(campaignObj.headers?.in_reply_to)
  expect(campaign.headers?.thread_id).to.be.equal(campaignObj.headers?.thread_id)
  expect(campaign.notifications_enabled).to.be.equal(campaignObj.notifications_enabled)

  const attachments = await EmailCampaignAttachment.getByCampaign(campaign.id)

  expect(attachments[0].type).to.be.equal('email_campaign_attachment')
  expect(attachments[0].campaign).to.be.equal(campaign.id)
  expect(attachments[0].file).to.be.equal(attachmentsObj.file)
  expect(attachments[0].is_inline).to.be.equal(attachmentsObj.is_inline)
  expect(attachments[0].content_id).to.be.equal(attachmentsObj.content_id)
}

async function testCampaignWithLargeAttachments() {
  const attachments = []

  let i = 0

  for (i; i < 25; i++ ) {
    const file = await uploadFile()

    attachments.push({
      file: file.id,
      is_inline: true,
      content_id: 'content_id'
    })
  }


  /** @type {IEmailCampaignInput} */
  const campaignObj = {
    subject: 'Test subject',
    from: userA.id,
    to: [
      {
        email: 'gholi@rechat.com',
        recipient_type: Email.EMAIL
      }
    ],
    created_by: userA.id,
    brand: brand1.id,
    due_at: new Date().toISOString(),
    html: '<html></html>',
    headers: {
      message_id: 'message_id',
      in_reply_to: 'in_reply_to',
      thread_id: 'thread_id',
    },
    google_credential: null,
    microsoft_credential: null,
    attachments: attachments,
    notifications_enabled: false
  }

  try {
    await EmailCampaign.createMany([campaignObj])
  } catch (ex) {

    const limit    = config.email_composer.attachment_upload_limit.mailgun
    const limitMsg = `${Math.round(limit / (1024 * 1024))}MB`

    expect(ex.message).to.be.equal(`Files size could not be greater than ${limitMsg}!`)
  }
}

async function testGmailWithLargeAttachments() {
  const gResult = await createGoogleCredential(userA, brand1)
  const googleCredential = gResult.credential

  const attachments = []

  let i = 1

  for (i; i < 10; i++ ) {
    const file = await uploadFile()

    attachments.push({
      file: file.id,
      is_inline: true,
      content_id: 'content_id'
    })
  }


  /** @type {IEmailCampaignInput} */
  const campaignObj = {
    subject: 'Test subject',
    from: userA.id,
    to: [
      {
        email: 'gholi@rechat.com',
        recipient_type: Email.EMAIL
      }
    ],
    created_by: userA.id,
    brand: brand1.id,
    due_at: new Date().toISOString(),
    html: '<html></html>',
    headers: {
      message_id: 'message_id',
      in_reply_to: 'in_reply_to',
      thread_id: 'thread_id',
    },
    google_credential: googleCredential.id,
    microsoft_credential: null,
    attachments: attachments,
    notifications_enabled: false
  }

  try {
    await EmailCampaign.createMany([campaignObj])
  } catch (ex) {

    const limit    = config.email_composer.attachment_upload_limit.gmail
    const limitMsg = `${Math.round((limit / (1024 * 1024)) * (3 / 4))}MB`

    expect(ex.message).to.be.equal(`Files size could not be greater than ${limitMsg}!`)
  }
}

async function testOutlookWithLargeAttachments() {
  const mResult = await createMicrosoftCredential(userA, brand1)
  const microsoftCredential = mResult.credential

  const attachments = []

  let i = 1

  for (i; i < 10; i++ ) {
    const file = await uploadFile()

    attachments.push({
      file: file.id,
      is_inline: true,
      content_id: 'content_id'
    })
  }


  /** @type {IEmailCampaignInput} */
  const campaignObj = {
    subject: 'Test subject',
    from: userA.id,
    to: [
      {
        email: 'gholi@rechat.com',
        recipient_type: Email.EMAIL
      }
    ],
    created_by: userA.id,
    brand: brand1.id,
    due_at: new Date().toISOString(),
    html: '<html></html>',
    headers: {
      message_id: 'message_id',
      in_reply_to: 'in_reply_to',
      thread_id: 'thread_id',
    },
    google_credential: null,
    microsoft_credential: microsoftCredential.id,
    attachments: attachments,
    notifications_enabled: false
  }

  try {
    await EmailCampaign.createMany([campaignObj])
  } catch (ex) {

    const limit    = config.email_composer.attachment_upload_limit.outlook
    const limitMsg = `${Math.round((limit / (1024 * 1024)) * (3 / 4))}MB`

    expect(ex.message).to.be.equal(`Files size could not be greater than ${limitMsg}!`)
  }
}

async function testGoogleEmail() {
  const gResult = await createGoogleCredential(userA, brand1)
  const googleCredential = gResult.credential

  /** @type {IEmailCampaignInput} */
  const campaignObj = {
    subject: 'Test subject',
    from: userA.id,
    to: googleToRecipients,
    created_by: userA.id,
    brand: brand1.id,
    due_at: new Date().toISOString(),
    html: '<html></html>',
    headers: {
      message_id: 'message_id',
      in_reply_to: 'in_reply_to',
      thread_id: 'thread_id',
    },
    google_credential: googleCredential.id,
    microsoft_credential: null,
    attachments: [],
    notifications_enabled: false
  }

  const result   = await EmailCampaign.createMany([campaignObj])
  const campaign = await EmailCampaign.get(result[0])

  expect(campaign.google_credential).to.be.equal(googleCredential.id)

  return campaign
}

async function testMicrosoftEmail() {
  const mResult = await createMicrosoftCredential(userA, brand1)
  const microsoftCredential = mResult.credential

  /** @type {IEmailCampaignInput} */
  const campaignObj = {
    subject: 'Test subject',
    from: userA.id,
    to: microsoftToRecipients,
    created_by: userA.id,
    brand: brand1.id,
    due_at: new Date().toISOString(),
    html: '<html></html>',
    headers: {
      message_id: 'message_id',
      in_reply_to: 'in_reply_to',
      thread_id: 'thread_id',
    },
    google_credential: null,
    microsoft_credential: microsoftCredential.id,
    attachments: [],
    notifications_enabled: false
  }

  const result   = await EmailCampaign.createMany([campaignObj])
  const campaign = await EmailCampaign.get(result[0])

  expect(campaign.microsoft_credential).to.be.equal(microsoftCredential.id)

  return campaign
}

async function testGMFailure() {
  const gResult = await createGoogleCredential(userA, brand1)
  const googleCredential = gResult.credential

  const mResult = await createMicrosoftCredential(userA, brand1)
  const microsoftCredential = mResult.credential

  /** @type {IEmailCampaignInput} */
  const campaignObj = {
    subject: 'Test subject',
    from: userA.id,
    to: [
      {
        email: 'gholi@rechat.com',
        recipient_type: Email.EMAIL
      }
    ],
    created_by: userA.id,
    brand: brand1.id,
    due_at: new Date().toISOString(),
    html: '<html></html>',
    headers: {
      message_id: 'message_id',
      in_reply_to: 'in_reply_to',
      thread_id: 'thread_id',
    },
    google_credential: googleCredential.id,
    microsoft_credential: microsoftCredential.id,
    attachments: [],
    notifications_enabled: false
  }

  try {
    await EmailCampaign.createMany([campaignObj])
  } catch (ex) {
    expect(ex.message).to.be.equal('It is not allowed to send both google and microsoft ceredentials.')
  }
}

async function testGmailLoadOfRecipients() {
  const gResult = await createGoogleCredential(userA, brand1)
  const googleCredential = gResult.credential

  const to = []

  let i = 1
  for (i; i < 1005; i++) {
    to.push({
      email: `gholi_${i}@rechat.com`,
      recipient_type: Email.EMAIL
    })
  }

  /** @type {IEmailCampaignInput} */
  const campaignObj = {
    subject: 'Test subject',
    from: userA.id,
    to,
    created_by: userA.id,
    brand: brand1.id,
    due_at: new Date().toISOString(),
    html: '<html></html>',
    headers: {
      message_id: 'message_id',
      in_reply_to: 'in_reply_to',
      thread_id: 'thread_id',
    },
    google_credential: googleCredential.id,
    microsoft_credential: null,
    attachments: [],
    notifications_enabled: false
  }

  try {
    await EmailCampaign.createMany([campaignObj])
  } catch (ex) {
    expect(ex.message).to.be.equal('Recipients number should not be greater than 1000 in normal campaigns.')
  }
}

async function testOutlookLoadOfRecipients() {
  const mResult = await createMicrosoftCredential(userA, brand1)
  const microsoftCredential = mResult.credential

  const to = []

  let i = 1
  for (i; i < 1005; i++) {
    to.push({
      email: `gholi_${i}@rechat.com`,
      recipient_type: Email.EMAIL
    })
  }

  /** @type {IEmailCampaignInput} */
  const campaignObj = {
    subject: 'Test subject',
    from: userA.id,
    to,
    cc: to,
    bcc: to,
    created_by: userA.id,
    brand: brand1.id,
    due_at: new Date().toISOString(),
    html: '<html></html>',
    headers: {
      message_id: 'message_id',
      in_reply_to: 'in_reply_to',
      thread_id: 'thread_id',
    },
    google_credential: null,
    microsoft_credential: microsoftCredential.id,
    attachments: [],
    notifications_enabled: false
  }

  try {
    await EmailCampaign.createMany([campaignObj])
  } catch (ex) {
    expect(ex.message).to.be.equal('Recipients number should not be greater than 1000 in normal campaigns.')
  }
}

async function createEmailCampaignEmail() {
  const gResult = await createGoogleCredential(userA, brand1)
  const googleCredential = gResult.credential

  /** @type {IEmailCampaignInput} */
  const campaignObj = {
    subject: 'Test subject',
    from: userA.id,
    to: [{
      email: 'gholi@rechat.com',
      recipient_type: Email.EMAIL
    }],
    created_by: userA.id,
    brand: brand1.id,
    due_at: new Date().toISOString(),
    html: '<html></html>',
    headers: {
      message_id: 'message_id',
      in_reply_to: 'in_reply_to',
      thread_id: 'thread_id',
    },
    google_credential: googleCredential.id,
    microsoft_credential: null,
    attachments: [],
    notifications_enabled: false
  }

  const result     = await EmailCampaign.createMany([campaignObj])
  const campaign   = await EmailCampaign.get(result[0])
  const recipients = await db.select('email/campaign/emails', [campaign.id])

  const email_obj = await Email.create({
    email: {
      to: [{
        email: 'gholi@rechat.com',
        recipient_type: Email.EMAIL
      }],
      cc: [],
      bcc: []
    },
    subject: 'subject',
    html: 'html',
    text: 'html'
  })

  const campaign_emails = recipients.map(to => {
    return {
      ...to,
      email: email_obj.id,
      email_address: to.email,
      campaign: campaign.id
    }
  })

  const ids = await EmailCampaignEmail.createAll(campaign_emails)
  const email_campaign_email_obj = await EmailCampaignEmail.get(ids.pop())

  expect(email_campaign_email_obj.campaign).to.be.equal(campaign.id)
  expect(email_campaign_email_obj.send_type).to.be.equal('To')
  expect(email_campaign_email_obj.email_address).to.be.equal('gholi@rechat.com')

  return {
    email_obj,
    email_campaign_email_obj
  }
}

async function emailSaveError() {
  const { email_obj, email_campaign_email_obj } = await createEmailCampaignEmail()

  const err = {
    message: 'error_message'
  }

  await EmailCampaignEmail.saveError(email_obj, err)

  const updated = await EmailCampaignEmail.get(email_campaign_email_obj.id)

  expect(updated.id).to.be.equal(email_campaign_email_obj.id)
  expect(updated.error).to.be.equal(err.message)
}

async function saveError() {
  const gResult = await createGoogleCredential(userA, brand1)
  const googleCredential = gResult.credential

  /** @type {IEmailCampaignInput} */
  const campaignObj = {
    subject: 'Test subject',
    from: userA.id,
    to: [{
      email: 'gholi@rechat.com',
      recipient_type: Email.EMAIL
    }],
    created_by: userA.id,
    brand: brand1.id,
    due_at: new Date().toISOString(),
    html: '<html></html>',
    headers: {
      message_id: 'message_id',
      in_reply_to: 'in_reply_to',
      thread_id: 'thread_id',
    },
    google_credential: googleCredential.id,
    microsoft_credential: null,
    attachments: [],
    notifications_enabled: false
  }

  const result   = await EmailCampaign.createMany([campaignObj])
  const campaign = await EmailCampaign.get(result[0])

  const failure = 'failure'
  await EmailCampaign.saveError(campaign, failure)
  const updated = await EmailCampaign.get(campaign.id)

  expect(updated.id).to.be.equal(campaign.id)
  expect(updated.failure).to.be.equal(failure)

  try {
    throw new Error('Maximum marketing email quota per month exceeded.')

  } catch (ex) {

    await EmailCampaign.saveError(campaign, ex.message)
    const updated = await EmailCampaign.get(campaign.id)

    expect(updated.id).to.be.equal(campaign.id)
    expect(updated.failure).to.be.equal(ex.message)
  }
}

async function saveThreadKey() {
  const gResult = await createGoogleCredential(userA, brand1)
  const googleCredential = gResult.credential

  /** @type {IEmailCampaignInput} */
  const campaignObj = {
    subject: 'Test subject',
    from: userA.id,
    to: [{
      email: 'gholi@rechat.com',
      recipient_type: Email.EMAIL
    }],
    created_by: userA.id,
    brand: brand1.id,
    due_at: new Date().toISOString(),
    html: '<html></html>',
    headers: {
      message_id: 'message_id',
      in_reply_to: 'in_reply_to',
      thread_id: 'thread_id',
    },
    google_credential: googleCredential.id,
    microsoft_credential: null,
    attachments: [],
    notifications_enabled: false
  }

  const result   = await EmailCampaign.createMany([campaignObj])
  const campaign = await EmailCampaign.get(result[0])

  await EmailCampaign.saveThreadKey(campaign.id, 'thread_key')

  const updated = await EmailCampaign.get(result[0])

  expect(updated.id).to.be.equal(campaign.id)
  expect(updated.thread_key).to.be.equal('thread_key')
}

async function update() {
  const gResult = await createGoogleCredential(userA, brand1)
  const googleCredential = gResult.credential

  const mResult = await createMicrosoftCredential(userA, brand1)
  const microsoftCredential = mResult.credential

  const campaign = await testGoogleEmail()

  const updated_one = await EmailCampaign.update({
    ...campaign,
    subject: 'custom_subject',
    due_at: new Date(campaign.due_at),
    google_credential: null,
    microsoft_credential: null
  })

  expect(updated_one.subject).to.be.equal('custom_subject')
  expect(updated_one.google_credential).to.be.equal(null)
  expect(updated_one.microsoft_credential).to.be.equal(null)


  const  updated_two = await EmailCampaign.update({
    ...campaign,
    subject: 'custom_subject',
    due_at: new Date(campaign.due_at),
    google_credential: googleCredential.id,
    microsoft_credential: null,
    notifications_enabled: true
  })

  expect(updated_two.google_credential).to.be.equal(googleCredential.id)
  expect(updated_two.microsoft_credential).to.be.equal(null)
  expect(updated_two.notifications_enabled).to.be.equal(true)


  const updated_three = await EmailCampaign.update({
    ...campaign,
    subject: 'custom_subject',
    due_at: new Date(campaign.due_at),
    google_credential: null,
    microsoft_credential: microsoftCredential.id
  })

  expect(updated_three.google_credential).to.be.equal(null)
  expect(updated_three.microsoft_credential).to.be.equal(microsoftCredential.id)


  const updated_four = await EmailCampaign.update({
    ...campaign,
    subject: 'custom_subject',
    due_at: new Date(campaign.due_at),
    google_credential: null,
    microsoft_credential: microsoftCredential.id,
    individual: true
  })

  expect(updated_four.individual).to.be.equal(true)

  try {
    await EmailCampaign.update({
      ...campaign,
      subject: 'custom_subject',
      due_at: new Date(campaign.due_at),
      google_credential: googleCredential.id,
      microsoft_credential: microsoftCredential.id
    })

  } catch (err) {

    expect(err.message).to.be.equal('It is not allowed to send both google and microsoft ceredentials.')
  }
}

async function enableDisableNotification() {
  const campaign = await testGoogleEmail()

  await EmailCampaign.enableDisableNotification(campaign.id, true)
  const updated_one = await EmailCampaign.get(campaign.id)
  expect(updated_one.notifications_enabled).to.be.equal(true)

  await EmailCampaign.enableDisableNotification(campaign.id, false)
  const updated_two = await EmailCampaign.get(campaign.id)
  expect(updated_two.notifications_enabled).to.be.equal(false)
}

async function testOmitUnsubscribedRecipients () {
  const emails = {
    subscribed: 'contact+subs@rechat.com',
    unsubscribed: 'contact+unsub@rechat.com',
    independent: 'noncontact@rechat.com',
  }

  const opts = { activity: false, get: false, relax: false }
  const contactsInfo = [{
    user: userA.id,
    attributes: attributes({ email: emails.subscribed })
  }, {
    user: userA.id,
    attributes: attributes({ email: emails.unsubscribed, tag: ['Unsubscribed'] }),
  }]

  await Contact.create(contactsInfo, userA.id, brand1.id, 'direct_request', opts)

  const filteredRecipients = await EmailCampaign.omitUnsubscribedRecipients(
    brand1.id,
    userA.id,
    Object.values(emails).map(email => ({ email })),
  )

  expect(filteredRecipients)
    .to.be.an('array').with.lengthOf(2)
    .which.satisfies(rec => rec.every(r => r.email !== emails.unsubscribde))
}

describe('Email', () => {
  createContext()
  beforeEach(setup)

  it('should send emails to a set of tags', testEmailToTags)
  it('should not send duplicate emails to a contact with two tags', testDuplicateEmailWithTag)
  it('should not send duplicate emails to two contacts with same email', testDuplicateEmailWithEmail)
  it('should send only to specified emails if no list or tag were given', testEmailsOnly)
  it('should prevent contacts from other brands to get the email', testCampaignRecipients)
  it('should prevent contacts from other brands to get the email', testCampaignToAllContacts)

  it('should create new attachments record', testInsertAttachments)
  it('should test get attachments', testAttachmentsGetByCampaign)
  it('should test deleted attachments', testDeleteAttachments)

  it('should give correct attachments and headers for a specific campaing', testCampaignWithAttachments)
  it('should fail after attaching large files for mailgun', testCampaignWithLargeAttachments)
  it('should fail after attaching large files for gmail', testGmailWithLargeAttachments)
  it('should fail after attaching large files for outlook', testOutlookWithLargeAttachments)

  it('should handle a gmail-message', testGoogleEmail)
  it('should handle an outlook-message', testMicrosoftEmail)
  it('should fail when both of google and microsoft are present', testGMFailure)

  it('should fail when recipients num are more than 1000', testGmailLoadOfRecipients)
  it('should fail when recipients num are more than 500', testOutlookLoadOfRecipients)

  it('should create an email_campaing_email record', createEmailCampaignEmail)
  it('should save error message on an email_campaing_email record', emailSaveError)
  it('should save error message on an email_campaing record', saveError)
  it('should save thread key on an email_campaing record', saveThreadKey)

  it('should update a campaign record', update)
  it('should update campaign\'s notifications_enabled status', enableDisableNotification)

  it('should omit unsubscribed recipients', testOmitUnsubscribedRecipients)
})
