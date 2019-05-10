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
    ...agent_json,
    ...props
  })
  
  Context.set({ agent })
}

async function create() {
  const credential = {
    agent: agent,
    username: credential_json.username,
    password: credential_json.password
  }

  const credentialId = await ShowingsCredential.create(credential)

  expect(credentialId).to.be.uuid
}

async function getByAgent() {
  await create()

  const credentialObj = await ShowingsCredential.getByAgent(agent)

  expect(agent).to.equal(credentialObj.agent)
  expect(credentialObj).to.include(credential_json)
}

async function update() {
  await create()

  const credentialObj = await ShowingsCredential.getByAgent(agent)

  const body = {
    username: 'my_new_username',
    password: 'my_new_password'
  }
  await ShowingsCredential.update(credentialObj.id, body)

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


async function createShowings() {
  const body = {
    agent: agent,
    ...showing_json
  }

  const showingId = await Showings.create(body)

  expect(showingId).to.be.uuid
}

async function getShowingByAgent() {
  await createShowings()

  const showingObj = await Showings.getByAgent(agent)

  expect(agent).to.equal(showingObj.agent)
  expect(showingObj.mls_number).to.equal(showing_json.mls_number)
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
    it('should return a credential record based on agent id', getByAgent)
    it('should update a credential record', update)
    it('should delete a credential record', deleteCredential)
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
