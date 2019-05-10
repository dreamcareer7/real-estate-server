const { expect } = require('chai')

const { createContext } = require('../helper')
const Context = require('../../../lib/models/Context')

// const Showings = require('../../../lib/models/Showings/showings')
const ShowingsCredential = require('../../../lib/models/Showings/credential')

const agent_json = require('./data/agent.json')
const credential_json = require('./data/credential.json')

let agent


async function setupOne() {
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


async function setupTwo() {
}


describe('Showings', () => {
  describe('Showings Credential', () => {
    createContext()
    beforeEach(setupOne)

    it('should create a credential record', create)
    it('should return a credential record based on agent id', getByAgent)
    it('should update a credential record', update)
    it('should delete a credential record', deleteCredential)
  })

  describe('Showings Appoinments (events)', () => {
    createContext()
    beforeEach(setupTwo)

  })
})
