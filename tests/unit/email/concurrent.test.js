const { expect } = require('chai')

const EmailCampaign = {
  ...require('../../../lib/models/Email/campaign/get'),
  ...require('../../../lib/models/Email/campaign/create'),
  ...require('../../../lib/models/Email/campaign/delete'),
  ...require('../../../lib/models/Email/campaign/due'),
  ...require('../../../lib/models/Email/campaign/send'),
}
const Email = require('../../../lib/models/Email/constants')
const User = require('../../../lib/models/User/get')

const { executeInContext, prepareContext } = require('../helper')
const BrandHelper = require('../brand/helper')

const globalState = {}

async function setupTests() {
  await executeInContext({ id: 'mocha:before'}, async () => {
    const user = await User.getByEmail('test@rechat.com')
    const brand = await BrandHelper.create({
      roles: {
        Admin: [user.id]
      },
      checklists: [],
      contexts: []
    })

    globalState.user = user
    globalState.brand = brand
  })
}

async function createCampaign() {
  const { user, brand } = globalState

  /** @type {IEmailCampaignInput} */
  const campaign = {
    created_by: user.id,
    brand: brand.id,
    from: user.id,
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

  return EmailCampaign.createMany([campaign])
}

async function cleanup() {
  await executeInContext({ id: 'mocha:after' }, async () => {
    const { user, brand } = globalState
    const campaigns = await EmailCampaign.getByBrand(brand.id)
    
    await EmailCampaign.deleteMany(campaigns.map(c => c.id), user.id, brand.id)
  })
}

async function testConcurrentCampaignPollerWorker() {
  const sharedState = {
    /** @type {UUID[]} */
    campaign_ids: []
  }

  async function setup() {
    sharedState.campaign_ids = await executeInContext({ id: 'ConcurrentCampaignPollerWorker:setup' }, createCampaign)
  }

  async function* poller() {
    await executeInContext({ id: 'poller' }, async () => {
      const dueBeforeWorker = await EmailCampaign.getDue()
      expect(dueBeforeWorker).to.have.members(sharedState.campaign_ids)
    })

    yield

    await executeInContext({ id: 'poller' }, async () => {
      const dueAfterWorker = await EmailCampaign.getDue()
      expect(dueAfterWorker).to.be.empty
    })
  }

  async function* worker() {
    // prepareContext allows yielding in the middle of the transaction
    const { run, done } = await prepareContext({ id: 'worker' })

    await run(() => {
      return EmailCampaign.lock(sharedState.campaign_ids[0])
    })

    // We are still in the transaction holding the lock
    yield

    // Commit and release the connection
    await done()
  }

  await setup()

  const p = poller()
  const w = worker()

  // Make sure our campaign is due now
  await p.next()

  // Lock the campaign as if being sent by a worker
  await w.next()

  // Campaign shouldn't be listed again as due
  await p.next()

  // Commit worker, releasing the lock
  await w.next()
}

describe('Email', () => {
  before(setupTests)
  it('should lock a campaign when sending', testConcurrentCampaignPollerWorker)
  after(cleanup)
})
