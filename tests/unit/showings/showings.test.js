const { expect } = require('chai')
const { createContext, handleJobs } = require('../helper')

const Context = require('../../../lib/models/Context')
const Job = require('../../../lib/models/Job')
const Showings = require('../../../lib/models/Showings/showings')
const ShowingsCredential = require('../../../lib/models/Showings/credential')
const User = require('../../../lib/models/User')
const Brand = require('../../../lib/models/Brand')
const CrmTask = require('../../../lib/models/CRM/Task')
const { Listing } = require('../../../lib/models/Listing')
const DealHelper = require('../deal/helper')
const BrandHelper = require('../brand/helper')

const agent_json = require('./data/agent.json')
const credential_json = require('./data/credential.json')
const showing_json = require('./data/showing.json')

let agent, user, brand
const mlsNumbers = [10018693, 10183366]



async function setup() {
  const props = {}
  agent = await Agent.create({
    ...agent_json[0],
    ...props
  })

  user = await User.getByEmail('test@rechat.com')
  brand = await BrandHelper.create({ roles: { Admin: [user.id] } })

  Context.set({ user, brand, agent })
}

async function crawlerJobHelper() {
  const userA = await User.getByEmail('test@rechat.com')
  const brandA = await BrandHelper.create({ roles: { Admin: [userA.id] } })

  const userB = await User.getByEmail('test+email@rechat.com')
  const brandB = await BrandHelper.create({ roles: { Admin: [userB.id] } })

  const credentialBodyA = {
    user: userA.id,
    brand: brandA.id,
    username: credential_json.username,
    password: credential_json.password
  }

  const credentialBodyB = {
    user: userB.id,
    brand: brandB.id,
    username: credential_json.username,
    password: credential_json.password
  }

  const credentialA_id = await ShowingsCredential.create(credentialBodyA)
  const credentialB_id = await ShowingsCredential.create(credentialBodyB)

  return [
    credentialA_id,
    credentialB_id
  ]
}

async function singleCrawlerJobHelper() {
  const user = await User.getByEmail('test@rechat.com')
  const brand = Brand.getCurrent()
  const listing = await Listing.getByMLSNumber(mlsNumbers[0])

  const deal = await DealHelper.create(user.id, brand.id, {
    listing: listing.id,
    deal_type: 'Selling'
  })

  const filter = {
    brand: brand.id,
    listing: listing.id
  }

  const deals = await Deal.filter({
    filter,
    user
  })

  expect(deal.id).to.be.equal(deals[0].id)

  const credentialBody = {
    user: user.id,
    brand: brand.id,
    username: credential_json.username,
    password: credential_json.password
  }

  return await ShowingsCredential.create(credentialBody)
}

async function create() {
  const credentialBody = {
    user: user.id,
    brand: brand.id,
    username: credential_json.username,
    password: credential_json.password
  }

  const credentialId = await ShowingsCredential.create(credentialBody)
  expect(credentialId).to.be.uuid

  return credentialId
}

async function getById() {
  const credentialId = await create()
  const credentialObj = await ShowingsCredential.get(credentialId)

  expect(user.id).to.equal(credentialObj.user)
  expect(brand.id).to.equal(credentialObj.brand)
  expect(credentialObj).to.include(credential_json)
  expect(credentialObj.type).to.be.equal('showings_credentials')
}

async function getByUser() {
  await create()

  const credentialObj = await ShowingsCredential.getByUser(user.id, brand.id)

  expect(credentialObj.user).to.equal(user.id)
  expect(credentialObj.brand).to.equal(brand.id)
  expect(credentialObj).to.include(credential_json)
}

async function updateCredential() {
  const credentialId = await create()

  const credentialObj = await ShowingsCredential.get(credentialId)

  const body = {
    username: 'my_new_username',
    password: 'my_new_password'
  }
  await ShowingsCredential.updateCredential(credentialObj.id, body)

  const updated = await ShowingsCredential.get(credentialObj.id)
  expect(updated).to.include(body)
}

async function deleteCredential() {
  const credentialId = await create()
  const credentialObj = await ShowingsCredential.get(credentialId)

  await ShowingsCredential.delete(credentialObj.id)

  const deleteed = await ShowingsCredential.get(credentialId)
  expect(deleteed.deleted_at).not.to.be.null
}

async function crawlerJobRecords() {
  const created_ids = await crawlerJobHelper()
  const returned_ids = await ShowingsCredential.crawlerJob()

  expect(created_ids).to.have.length(2)
  expect(returned_ids).to.have.length(2)

  for (const key in created_ids) {
    expect(returned_ids).to.contain(created_ids[key])
  }
}

async function crawlerJobUpdatedRecords() {
  const created_ids = await crawlerJobHelper()
  expect(created_ids).to.have.length(2)

  const lastCrawledTS = new Date().setDate(-3)
  await ShowingsCredential.updateLastCrawledDate(created_ids[0], lastCrawledTS)

  const updatedRecord = await ShowingsCredential.get(created_ids[0])  
  expect(updatedRecord.last_crawled_at).to.be.not.null

  const updated_returned_ids = await ShowingsCredential.crawlerJob()
  expect(updated_returned_ids).to.have.length(1)

  const returned_ids = await ShowingsCredential.crawlerJob()
  expect(returned_ids).to.have.length(1)
}

async function SingleCrawlerJob() {
  const showingCredentialId = await singleCrawlerJobHelper()
  const showingCredential = await ShowingsCredential.get(showingCredentialId)

  expect(showingCredential.last_crawled_at).to.be.null

  let isFirstCrawl = true
  if( showingCredential.last_crawled_at )
    isFirstCrawl = false

  const data = {
    meta: {
      isFirstCrawl: isFirstCrawl,
      action: 'showings'
    },
    showingCredential: showingCredential
  }

  const job = Job.queue.create('showings_crawler', data).removeOnComplete(true)  
  Context.get('jobs').push(job)

  await handleJobs()

  const crawledShowingCredential = await ShowingsCredential.get(showingCredentialId)
  expect(crawledShowingCredential.last_crawled_at).not.to.be.null

  const showingRecords = await Showings.getManyByCredential(crawledShowingCredential.id)

  for( const showingRecord of showingRecords ) {
    expect(showingRecord.crm_task).to.be.uuid

    const crmTask = await CrmTask.get(showingRecord.crm_task)
    expect(crmTask.task_type).to.be.eqls('Showing')
  }
}

async function crawlerJob() {
  await crawlerJobHelper()

  const returned_ids = await ShowingsCredential.crawlerJob()
  expect(returned_ids).to.have.length(2)
  
  await handleJobs()

  const crawledShowingCredential = await ShowingsCredential.get(returned_ids[0])
  expect(crawledShowingCredential.last_crawled_at).not.to.be.null

  const showingRecords = await Showings.getManyByCredential(crawledShowingCredential.id)

  for( const showingRecord of showingRecords ) {
    expect(showingRecord.crm_task).to.be.uuid

    const crmTask = await CrmTask.get(showingRecord.crm_task)
    expect(crmTask.task_type).to.be.eqls('Showing')
  }
}


async function createShowings() {
  const credential_id = await create()

  const showingBody = {
    credential_id: credential_id,
    ...showing_json[0]
  }

  const taskBody = {
    user: user.id,
    brand: brand.id,
    title: showing_json[0].mls_title,
    due_date: new Date(showing_json[0].start_date).getTime(),
    status: 'PENDING', // Read from showing.result
    task_type: 'Showing'
  }

  const showingId = await Showings.create(showingBody, taskBody)

  await Showings.get(showingId)
  expect(showingId).to.be.uuid

  return showingId
}

async function testUpsert() {
  const credential_id = await create()

  let showingBody = {
    credential_id: credential_id,
    ...showing_json[0]
  }

  const taskBody = {
    brand: brand.id,
    user: user.id,
    title: showing_json[0].mls_title,
    due_date: new Date(showing_json[0].start_date).getTime(),
    status: 'PENDING',
    task_type: 'Showing'
  }


  const showingId = await Showings.create(showingBody, taskBody)
  const showing = await Showings.get(showingId)

  showingBody = {
    credential_id: credential_id,
    ...showing
  }

  showingBody.mls_number = 'xxxxx' // its not updatable
  showingBody.mls_title = 'yyyyyy'
  showingBody.result = 'zzzzz'

  const sameSowingId = await Showings.create(showingBody, taskBody)
  const sameShowing = await Showings.get(sameSowingId)

  expect(showing.id).to.equal(sameShowing.id)
  expect(showing.agent).to.equal(sameShowing.agent)
  expect(showing.mls_number).to.equal(sameShowing.mls_number)
  expect(showing.mls_title).not.to.equal(sameShowing.mls_title)
}

async function getShowingByCredential() {
  const showingId = await createShowings()
  const createdShowingObj = await Showings.get(showingId)

  const showingObj = await Showings.getOneByCredential(createdShowingObj.credential)

  expect(showingId).to.equal(showingObj.id)
  expect(showingObj.mls_number).to.equal(showing_json[0].mls_number)
}

async function deleteShowing() {
  const showingId = await createShowings()

  await Showings.delete(showingId)

  const deleteed = await Showings.get(showingId)
  expect(deleteed.deleted_at).not.to.be.null
}


async function dealFilter() {
  const user = await User.getByEmail('test@rechat.com')
  const brand = Brand.getCurrent()
  const listing = await Listing.getByMLSNumber(mlsNumbers[0])

  const deal = await DealHelper.create(user.id, brand.id, {
    listing: listing.id,
    deal_type: 'Selling'
  })

  const filter = {
    brand: deal.brand,
    listing: listing.id
  }

  const deals = await Deal.filter({
    filter,
    user
  })

  expect(deal.id).to.be.equal(deals[0].id)
}


describe('Showings', () => {
  describe('Showings Credential', () => {
    createContext()
    beforeEach(setup)

    it('should create a credential record', create)
    it('should return a credential record', getById)
    it('should return a credential record based on user id', getByUser)
    it('should update a credential record user/pass', updateCredential)
    it('should delete a credential record', deleteCredential)
    it('should return some credential ids', crawlerJobRecords)
    it('should return some credential ids with one updated record', crawlerJobUpdatedRecords)
    it('should completely test crawlerJob - single', SingleCrawlerJob)
    it('should completely test crawlerJob', crawlerJob)
  })

  describe('Showings Appoinments (events)', () => {
    createContext()
    beforeEach(setup)

    it('should create a showings record', createShowings)
    it('should upsert a showings record correctly', testUpsert)
    it('should return a showings record based on agent id', getShowingByCredential)
    it('should delete a showings record', deleteShowing)
  })

  describe('Extra guest test => Deals Filter', () => {
    createContext()
    beforeEach(setup)

    it('should create and retrun same deal', dealFilter)
  })
})