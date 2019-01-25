const { expect } = require('chai')

const { createContext, handleJobs } = require('../helper')
const promisify = require('../../../lib/utils/promisify')
const sql = require('../../../lib/models/SupportBot/sql')

const Contact = require('../../../lib/models/Contact')
const Context = require('../../../lib/models/Context')
const EmailCampaign = require('../../../lib/models/EmailCampaign')
const User = require('../../../lib/models/User')

const { createBrand } = require('../brand/helper')

let user, brand

async function setup() {
  user = await promisify(User.getByEmail)('test@rechat.com')

  brand = await createBrand({
    roles: {
      Admin: [user.id]
    }
  })
  Context.set({ user, brand })

  await createContact()
}

async function createContact() {
  await Contact.create(
    [
      {
        user: user.id,
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
        user: user.id,
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
        user: user.id,
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
    user.id,
    brand.id,
    { activity: false, get: false, relax: false }
  )

  await handleJobs()
}

async function getEmails() {
  return sql.select(`
    SELECT
      *
    FROM
      emails
  `)
}

async function testEmailToTags() {
  const campaign = {
    from: user.id,
    to: [
      {
        tag: 'Tag1'
      },
      {
        tag: 'Tag2'
      }
    ],
    subject: '2',
    html: 'test'
  }

  const { filters } = EmailCampaign._getFilters(campaign.to)

  Context.log(filters)
  expect(filters).to.have.length(1)
  expect(filters[0].attribute_type).to.be.equal('tag')
  expect(filters[0].operator).to.be.equal('any')
  expect(filters[0].value).to.have.members(['Tag1', 'Tag2'])

  const summaries = await EmailCampaign._filterContacts(campaign.to, brand.id)
  expect(summaries).to.have.length(2)

  const contact_ids = await EmailCampaign.create(campaign, brand.id)

  expect(contact_ids).to.have.length(2)
}

async function testDuplicateEmail() {
  const campaign = {
    from: user.id,
    to: [
      {
        tag: 'Tag1'
      },
      {
        tag: 'Tag4'
      }
    ],
    subject: 'testDuplicateEmail',
    html: 'test'
  }

  const { filters } = EmailCampaign._getFilters(campaign.to)

  Context.log(filters)
  expect(filters).to.have.length(1)
  expect(filters[0].attribute_type).to.be.equal('tag')
  expect(filters[0].operator).to.be.equal('any')
  expect(filters[0].value).to.have.members(['Tag1', 'Tag4'])

  const summaries = await EmailCampaign._filterContacts(campaign.to, brand.id)
  expect(summaries).to.have.length(1)

  const contact_ids = await EmailCampaign.create(campaign, brand.id)
  expect(contact_ids).to.have.length(1)

  await handleJobs()

  const emails = await getEmails()
  expect(emails).to.have.length(1)
}

describe('Contact', () => {
  createContext()
  beforeEach(setup)

  describe('Email', () => {
    it('should send emails to a set of tags', testEmailToTags)
    it('should not send duplicate emails to a contact with two tags', testDuplicateEmail)
  })
})
