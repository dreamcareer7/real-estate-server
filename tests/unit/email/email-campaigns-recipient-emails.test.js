const { expect } = require('chai')
const sql = require('../../../lib/utils/sql')

const { attributes } = require('../contact/helper')
const { createContext } = require('../helper')
const BrandHelper = require('../brand/helper')
const UserHelper = require('../user/helper')

const { TAG, CONTACT } = require('../../../lib/models/Email/constants')
const Contact = require('../../../lib/models/Contact/manipulate')
const Campaign = require('../../../lib/models/Email/campaign')

const TEST_CAMPAIGN = {
  subject: 'Test Campaign',
  html: '<strong>Test Campaign</strong>',
  due_at: '2022-03-04',
  notifications_enabled: false,
}

const EMAIL1 = 'email1@rechat.com'
const EMAIL2 = 'email2@rechat.com'

async function findRecipientEmails () {
  return sql.query('SELECT * FROM email_campaigns_recipient_emails')
}

describe('email_campaigns_recipient_emails (SQL View)', () => {
  createContext()
  
  /** @type {IBrand} */
  let theBrand

  /** @type {IUser} */
  let theUser

  beforeEach(async () => {
    theBrand = await BrandHelper.create()
    theUser = await UserHelper.TestUser()
  })
  
  async function createContact ({ email, partnerEmail, tag = [] }) {
    const attrs = { email, tag }

    if (partnerEmail) { attrs.spouse_email = partnerEmail }
    
    const [id] = await Contact.create(
      [{ user: theUser.id, attributes: attributes(attrs) }],
      theUser.id,
      theBrand.id,
    )
    
    return id
  }

  async function createCampaign (data = TEST_CAMPAIGN) {
    data = {
      ...TEST_CAMPAIGN,
      created_by: theUser.id,
      brand: theBrand.id,
      from: theUser.id,      
      ...data,
    }
    
    const [id] = await Campaign.createMany([data])
    return id
  }
  
  context('for Agent recipient type...', () => {
    // TODO: WIP
  })

  context('for AllContacts recipient type...', () => {
    // TODO: WIP
  })

  context('for Brand recipient type...', () => {
    // TODO: WIP
  })
  
  context('for Contact recipient type...', () => {
    it('includes only the contact email', async () => {
      const contactId = await createContact({ email: EMAIL1 })

      const campaignId = await createCampaign({
        to: [{ recipient_type: CONTACT, contact: contactId }],
      })

      const results = await findRecipientEmails()

      expect(results).to.be.an('array')
        .that.has.lengthOf(1)
        .and.deep.include({
          campaign: campaignId,
          contact: contactId,
          email: EMAIL1,
          send_type: 'To',
          agent: null,          
        })
    })
    
    // TODO: WIP
  })
  
  context('for Email recipient type...', () => {
    // TODO: WIP
  })

  context('for List recipient type...', () => {
    // TODO: WIP
  })

  context('for Tag recipient type...', () => {
    it('includes contact email and partner email', async () => {
      const contactId = await createContact({
        email: EMAIL1,
        partnerEmail: EMAIL2,
        tag: ['foo', 'BaR'],
      })
      
      const campaignId = await createCampaign({
        to: [{ recipient_type: TAG, tag: 'bAr' }]
      })

      const results = await findRecipientEmails()
      const common = {
        campaign: campaignId,
        contact: contactId,
        send_type: 'To',
        agent: null,
      }
      
      expect(results).to.be.an('array')
        .that.has.lengthOf(2)
        .and.deep.include({ ...common, email: EMAIL1 })
        .and.deep.include({ ...common, email: EMAIL2 })
    })
    
    // TODO: WIP
  })
})
