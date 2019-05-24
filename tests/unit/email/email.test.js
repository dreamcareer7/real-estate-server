const { expect } = require('chai')

const { createContext, handleJobs } = require('../helper')

const Contact = require('../../../lib/models/Contact')
const Context = require('../../../lib/models/Context')
const User = require('../../../lib/models/User')
const EmailCampaign = require('../../../lib/models/Email/campaign')

const sql = require('../../../lib/utils/sql')

const BrandHelper = require('../brand/helper')

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
        attributes: [
          {
            attribute_type: 'first_name',
            text: 'Abbas'
          },
          {
            attribute_type: 'email',
            text: 'abbas@rechat.com'
          },
          {
            attribute_type: 'tag',
            text: 'Tag1'
          },
          {
            attribute_type: 'tag',
            text: 'Tag4'
          }
        ]
      },
      {
        user: userA.id,
        attributes: [
          {
            attribute_type: 'first_name',
            text: 'Emil'
          },
          {
            attribute_type: 'email',
            text: 'emil@rechat.com'
          },
          {
            attribute_type: 'tag',
            text: 'Tag2'
          }
        ]
      },
      {
        user: userA.id,
        attributes: [
          {
            attribute_type: 'first_name',
            text: 'Nasser'
          },
          {
            attribute_type: 'email',
            text: 'naser@rechat.com'
          },
          {
            attribute_type: 'tag',
            text: 'Tag3'
          }
        ]
      }
    ],
    userA.id,
    brand1.id,
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
        tag: 'Tag1'
      },
      {
        tag: 'Tag2'
      }
    ],
    subject: '2',
    html: 'test',
    due_at: '2019-03-07'
  }

  await EmailCampaign.createMany([campaign])

  await EmailCampaign.sendDue()
}

async function testDuplicateEmail() {
  const campaign = {
    from: userA.id,
    to: [
      {
        tag: 'Tag1'
      },
      {
        tag: 'Tag4'
      }
    ],
    subject: 'testDuplicateEmail',
    html: 'test',
    brand: brand1.id
  }

  await EmailCampaign.createMany([campaign])
}

async function testEmailsOnly() {
  const campaign = {
    due_at: '2019-03-07',
    from: userA.id,
    to: [
      {
        email: 'gholi@rechat.com'
      }
    ],
    subject: 'testEmailOnly',
    html: 'test',
    brand: brand1.id
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
        tag: 'Tag1'
      }
    ],
    subject: 'testRecipients',
    html: 'test',
    brand: brand1.id
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
  it('should not send duplicate emails to a contact with two tags', testDuplicateEmail)
  it('should send only to specified emails if no list or tag were given', testEmailsOnly)
  it('should prevent contacts from other brands to get the email', testCampaignRecipients)
})
