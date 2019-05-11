const { expect } = require('chai')

const { createContext } = require('../helper')
const Context = require('../../../lib/models/Context')

const Showings = require('../../../lib/models/Showings/showings')
const ShowingsCredential = require('../../../lib/models/Showings/credential')

const agent_json = require('./data/agent.json')
const credential_json = require('./data/credential.json')
const showing_json = require('./data/showing.json')

let agent



async function setup() {
  const props = {}
  
  agent = await Agent.create({
    ...agent_json[0],
    ...props
  })
  
  Context.set({ agent })
}

async function sendDueHelper() {
  const props = {}
  
  const agent_1 = await Agent.create({
    ...agent_json[1],
    ...props
  })

  const agent_2 = await Agent.create({
    ...agent_json[2],
    ...props
  })

  const agent_3 = await Agent.create({
    ...agent_json[3],
    ...props
  })

  const credentialBody_1 = {
    agent: agent_1,
    username: credential_json.username,
    password: credential_json.password
  }

  const credentialBody_2 = {
    agent: agent_2,
    username: credential_json.username,
    password: credential_json.password
  }

  const credentialBody_3 = {
    agent: agent_3,
    username: credential_json.username,
    password: credential_json.password
  }

  const credential_1_id = await ShowingsCredential.create(credentialBody_1)
  const credential_2_id = await ShowingsCredential.create(credentialBody_2)
  const credential_3_id = await ShowingsCredential.create(credentialBody_3)

  return [
    credential_1_id,
    credential_2_id,
    credential_3_id
  ]
}

async function create() {
  const credentialBody = {
    agent: agent,
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

  expect(agent).to.equal(credentialObj.agent)
  expect(credentialObj).to.include(credential_json)
  expect(credentialObj.type).to.be.equal('showings_credentials')
}

async function getByAgent() {
  await create()

  const credentialObj = await ShowingsCredential.getByAgent(agent)

  expect(agent).to.equal(credentialObj.agent)
  expect(credentialObj).to.include(credential_json)
}

async function updateCredential() {
  await create()

  const credentialObj = await ShowingsCredential.getByAgent(agent)

  const body = {
    username: 'my_new_username',
    password: 'my_new_password'
  }
  await ShowingsCredential.updateCredential(credentialObj.id, body)

  const updated = await ShowingsCredential.getByAgent(agent)

  expect(updated).to.include(body)
}

async function deleteCredential() {
  await create()

  const credentialObj = await ShowingsCredential.getByAgent(agent)

  await ShowingsCredential.delete(credentialObj.id)

  const deleteed = await ShowingsCredential.getByAgent(agent)

  expect(deleteed.deleted_at).not.to.be.null
}

async function sendDue() {
  const created_ids = await sendDueHelper()
  const returned_ids = await ShowingsCredential.sendDue()

  expect(created_ids).to.have.length(3)
  expect(returned_ids).to.have.length(3)

  for (const key in created_ids) {
    expect(returned_ids).to.contain(created_ids[key])
  }

  const lastCrawledTS = new Date().setDate(-3)
  await ShowingsCredential.updateLastCrawledDate(returned_ids[0], lastCrawledTS)
  const updatedRecord = await ShowingsCredential.get(returned_ids[0])
  
  expect(updatedRecord.last_crawled_at).to.be.not.null

  const updated_returned_ids = await ShowingsCredential.sendDue()

  expect(updated_returned_ids).to.have.length(2)
}


async function createShowings() {
  const body = {
    agent: agent,
    ...showing_json[0]
  }

  const showingId = await Showings.create(body)

  expect(showingId).to.be.uuid
}

async function getShowingByAgent() {
  await createShowings()

  const showingObj = await Showings.getByAgent(agent)

  expect(agent).to.equal(showingObj.agent)
  expect(showingObj.mls_number).to.equal(showing_json[0].mls_number)
}

async function updateShowing() {
  await createShowings()

  const showingObj = await Showings.getByAgent(agent)

  const body = {
    result: 'new_result',
    feedback_text: 'agent_feedback'
  }
  await Showings.update(showingObj.id, body)

  const updated = await Showings.getByAgent(agent)

  expect(updated).to.include(body)
}

async function deleteShowing() {
  await createShowings()

  const showingObj = await Showings.getByAgent(agent)

  await Showings.delete(showingObj.id)

  const deleteed = await Showings.getByAgent(agent)

  expect(deleteed.deleted_at).not.to.be.null
}



describe('Showings', () => {
  describe('Showings Credential', () => {
    createContext()
    beforeEach(setup)

    it('should create a credential record', create)
    it('should return a credential record', getById)
    it('should return a credential record based on agent id', getByAgent)
    it('should update a credential record user/pass', updateCredential)
    it('should delete a credential record', deleteCredential)
    it('should return some credential ids', sendDue)
  })

  describe('Showings Appoinments (events)', () => {
    createContext()
    beforeEach(setup)

    it('should create a showings record', createShowings)
    it('should return a showings record based on agent id', getShowingByAgent)
    it('should update a showings record', updateShowing)
    it('should delete a showings record', deleteShowing)
  })
})
