const { createContext, handleJobs } = require('../helper')

const Contact = require('../../../lib/models/Contact')

const BrandHelper = require('../brand/helper')

let user, brand

async function setup() {
  user = await User.getByEmail('test@rechat.com')

  brand = await BrandHelper.create({
    roles: {
      Admin: [user.id]
    },
    checklists: [],
    contexts: []
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
    html: 'test',
    due_at: '2019-03-07'
  }

  await EmailCampaign.create(campaign, brand.id)

  await EmailCampaign.sendDue()
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

  await EmailCampaign.create(campaign, brand.id)
}

async function testEmailsOnly() {
  const campaign = {
    due_at: '2019-03-07',
    from: user.id,
    to: [
      {
        email: 'gholi@rechat.com'
      }
    ],
    subject: 'testEmailOnly',
    html: 'test'
  }

  await EmailCampaign.create(campaign, brand.id)

  await EmailCampaign.sendDue()
}

describe('Contact', () => {
  createContext()
  beforeEach(setup)

  describe('Email', () => {
    it('should send emails to a set of tags', testEmailToTags)
    it('should not send duplicate emails to a contact with two tags', testDuplicateEmail)
    it('should send only to specified emails if no list or tag were given', testEmailsOnly)
  })
})
