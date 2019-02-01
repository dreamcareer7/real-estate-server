const { expect } = require('chai')

const { createContext } = require('../helper')

const json = require('./json/agent')

const officeJson = require('./json/office')

const save = async (props = {}) => {
  const id = await Agent.create({
    ...json,
    ...props
  })
  expect(id).to.be.a('string')

  return id
}

const get = async () => {
  const saved = await save()
  const fetched = await Agent.get(saved)

  expect(fetched.id).to.equal(saved)
}

const getAgents = async () => {
  const saved = await save()

  const fetched = await Agent.getAll([saved])

  expect(fetched[0].id).to.equal(saved)
}

const auditPhone = async () => {
  const saved = await save()

  await Agent.auditSecret(saved, json.phone_number)
}

const auditEmail = async () => {
  const saved = await save()

  await Agent.auditSecret(saved, json.email)
}

const auditFail = async () => {
  const saved = await save()

  let errored = false

  try {
    await Agent.auditSecret(saved, 'foo')
  } catch(err) {
    errored = true

    expect(err.http).to.equal(401)
  }

  expect(errored).to.be.true
}

const getByMls = async () => {
  const saved = await save()

  const fetched = await Agent.getByMLSID(json.mlsid)

  expect(fetched.id).to.equal(saved)
}

const getByOfficeMls = async () => {
  /*
   * This function only works if there is an office saved as well.
   * So, first, test it when the office is not saved. Agent should not
   * be found.
   *
   * Then, save the office and try again. It should be found then
   */
  const saved = await save()

  let fetched = await Agent.getByOfficeId(json.office_mlsid)
  expect(fetched).not.to.include(saved)

  await Office.create(officeJson)

  fetched = await Agent.getByOfficeId(json.office_mlsid)
  expect(fetched).not.to.include(saved)
}

const matchByEmail = async () => {
  const saved = await save()

  let fetched = await Agent.matchByEmail(json.email)
  expect(fetched).to.be.undefined

  await Agent.refreshContacts()

  fetched = await Agent.matchByEmail(json.email)
  expect(fetched.id).to.be.equal(saved)
}

const searchInactive = async () => {
  const saved = await save({
    status: Agent.INACTIVE
  })

  const fetched = await Agent.search(json.full_name)
  const ids = fetched.map(a => a.id)

  expect(ids).not.to.include(saved)
}

const searchActive = async () => {
  const saved = await save({
    status: Agent.ACTIVE
  })

  const fetched = await Agent.search(json.full_name)
  const ids = fetched.map(a => a.id)

  expect(ids).to.include(saved)
}

const publicize = async () => {
  const saved = await save()
  const agent = await Agent.get(saved)

  Agent.publicize(agent)

  expect(agent.emails).to.be.undefined
  expect(agent.phone_numbers).to.be.undefined
}

const report = async () => {
  /*
   * TODO: Actually asserting the results.
   * For now we only test to make sure it runs and the SQL is fine
   */
  await Agent.report({
    list_volume: {},
    list_value: {},
    sell_volume: {},
    sell_value: {},
    active_volume: {},
    active_value: {},
    total_active_volume: {},
    total_active_value: {},
    total_value: {},
    total_volume: {}
  })
}

describe('MLS Agent', () => {
  createContext()

  it('should save an agent', save)
  it('should fetch an agent', get)
  it('should fetch a list of agents', getAgents)
  it('should audit agent based on phone', auditPhone)
  it('should audit agent based on email', auditEmail)
  it('should fail audit agent based on wrong secret', auditFail)
  it('should fetch an agent by mlsid', getByMls)
  it('should fetch agents by their office mlsid', getByOfficeMls)
  it('should fetch agent by email', matchByEmail)
  it('should not find an inactive agent', searchInactive)
  it('should find an active agent', searchActive)
  it('should hide email and phone on publicize', publicize)
  it('should run agent report', report)

})
