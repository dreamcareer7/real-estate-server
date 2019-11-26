const { expect } = require('chai')

const { createContext, handleJobs } = require('../helper')

const Contact = require('../../../lib/models/Contact')
const Context = require('../../../lib/models/Context')
const Email = require('../../../lib/models/Email')
const User = require('../../../lib/models/User')
const EmailCampaign = require('../../../lib/models/Email/campaign')
const EmailCampaignAttachment = require('../../../lib/models/Email/campaign/attachments')
const AttachedFile = require('../../../lib/models/AttachedFile')

const db = require('../../../lib/utils/db')
const sql = require('../../../lib/utils/sql')
const fs = require('fs')
const path = require('path')

const BrandHelper = require('../brand/helper')
const { attributes } = require('../contact/helper')

const { createGoogleCredential } = require('../google/helper')
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
          tag: ['Tag1', 'Tag4']
        })
      },
      {
        user: userA.id,
        attributes: attributes({
          first_name: 'Emil',
          email: ['emil@rechat.com'],
          tag: ['Tag2']
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
    public: false
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
    due_at: '2019-03-07'
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
  expect(recipients[0].email).to.be.equal('abbas@rechat.com')
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
    created_by: userA.id
  }

  await EmailCampaign.createMany([campaign])

  await EmailCampaign.sendDue()
}

async function testCampaignRecipients() {
  await createContactForUserB()

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
    created_by: userA.id
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

async function testCampaignWithAttachments() {
  const file = await uploadFile()

  const attachmentsObj = {
    file: file.id,
    is_inline: true,
    content_id: 'content_i'
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
    attachments: [attachmentsObj]
  }

  const result   = await EmailCampaign.createMany([campaignObj])
  const campaign = await EmailCampaign.get(result[0])

  expect(campaign.headers.google_credential).to.be.equal(campaignObj.headers.google_credential)
  expect(campaign.headers.microsoft_credential).to.be.equal(campaignObj.headers.microsoft_credential)

  expect(campaign.headers.message_id).to.be.equal(campaignObj.headers.message_id)
  expect(campaign.headers.in_reply_to).to.be.equal(campaignObj.headers.in_reply_to)
  expect(campaign.headers.thread_id).to.be.equal(campaignObj.headers.thread_id)

  const attachments = await EmailCampaignAttachment.getByCampaign(campaign.id)

  expect(attachments[0].type).to.be.equal('email_campaign_attachment')
  expect(attachments[0].campaign).to.be.equal(campaign.id)
  expect(attachments[0].file).to.be.equal(attachmentsObj.file)
  expect(attachments[0].is_inline).to.be.equal(attachmentsObj.is_inline)
  expect(attachments[0].content_id).to.be.equal(attachmentsObj.content_id)
}

async function testGoogleEmail() {
  const gResult = await createGoogleCredential(userA, brand1)
  const googleCredential = gResult.credential

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
    attachments: []
  }

  const result   = await EmailCampaign.createMany([campaignObj])
  const campaign = await EmailCampaign.get(result[0])

  expect(campaign.google_credential).to.be.equal(googleCredential.id)
}

async function testMicrosoftEmail() {
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
    google_credential: null,
    microsoft_credential: microsoftCredential.id,
    attachments: []
  }

  const result   = await EmailCampaign.createMany([campaignObj])
  const campaign = await EmailCampaign.get(result[0])

  expect(campaign.microsoft_credential).to.be.equal(microsoftCredential.id)
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
    attachments: []
  }

  try {
    await EmailCampaign.createMany([campaignObj])
  } catch (ex) {
    expect(ex.message).to.be.equal('It is not allowed to send both google and microsoft ceredentials.')
  } 
}


describe('Email', () => {
  createContext()
  beforeEach(setup)

  it('should send emails to a set of tags', testEmailToTags)
  it('should not send duplicate emails to a contact with two tags', testDuplicateEmailWithTag)
  it('should not send duplicate emails to two contacts with same email', testDuplicateEmailWithEmail)
  it('should send only to specified emails if no list or tag were given', testEmailsOnly)
  it('should prevent contacts from other brands to get the email', testCampaignRecipients)

  it('should give correct attachments and headers for a specific campaing', testCampaignWithAttachments)
  it('should handle a gmail-message', testGoogleEmail)
  it('should handle an outlook-message', testMicrosoftEmail)
  it('should fail when both of google and microsoft are present', testGMFailure)
})
