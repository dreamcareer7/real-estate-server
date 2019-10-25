const { expect } = require('chai')

const { createContext, handleJobs } = require('../helper')

const Contact = require('../../../lib/models/Contact')
const Context = require('../../../lib/models/Context')
const Email = require('../../../lib/models/Email')
const User = require('../../../lib/models/User')
const EmailCampaign = require('../../../lib/models/Email/campaign')

const db = require('../../../lib/utils/db')
const sql = require('../../../lib/utils/sql')

const BrandHelper = require('../brand/helper')
const { attributes } = require('../contact/helper')

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

async function testEmailToTags() {
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

describe('Email', () => {
  createContext()
  beforeEach(setup)

  it('should send emails to a set of tags', testEmailToTags)
  it('should not send duplicate emails to a contact with two tags', testDuplicateEmailWithTag)
  it('should not send duplicate emails to two contacts with same email', testDuplicateEmailWithEmail)
  it('should send only to specified emails if no list or tag were given', testEmailsOnly)
  it('should prevent contacts from other brands to get the email', testCampaignRecipients)
})
