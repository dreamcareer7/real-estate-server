const { expect } = require('chai')

const { createContext, handleJobs } = require('../helper')
const Daily = require('../../../lib/models/Daily')
const EmailCampaign = require('../../../lib/models/Email/campaign')
const Email = require('../../../lib/models/Email/constants')
const User = require('../../../lib/models/User/get')
const BrandHelper = require('../brand/helper')

async function setup() {
  const user = await User.getByEmail('test@rechat.com')

  const brand = await BrandHelper.create({
    roles: {
      Admin: [user.id]
    }
  })

  const campaign = {
    subject: 'Test subject',
    from: user.id,
    to: [{
      email: 'gholi@rechat.com',
      recipient_type: Email.EMAIL
    }],
    created_by: user.id,
    brand: brand.id,
    due_at: new Date().toISOString(),
    html: '<html></html>'
  }

  await EmailCampaign.createMany([campaign])

  return { user }
}

async function sendDaily() {
  const { user } = await setup()

  await Daily.sendForUser(user.id)
  await handleJobs()
}

async function dontSendDuplicate() {
  const { user } = await setup()

  await Daily.sendForUser(user.id)

  try {
    await Daily.sendForUser(user.id)
    await handleJobs()
  } catch(e) {
    expect(e.code === '23505')
    return
  }

  throw new Error('Duplicate not prevented')
}

describe('Calendar', () => {
  createContext()


  it('should send a daily', sendDaily)
  it('should throw an error on second attempt', dontSendDuplicate)
})
