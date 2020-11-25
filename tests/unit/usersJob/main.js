const uuid       = require('uuid')
const { expect } = require('chai')
const { createContext } = require('../helper')

const Context       = require('../../../lib/models/Context')
const User          = require('../../../lib/models/User/get')
const BrandHelper   = require('../brand/helper')
const UsersJob      = require('../../../lib/models/UsersJob')

const { createGoogleCredential } = require('../google/helper')

let user, brand, googleCredential


async function createCredential() {
  const { credential, body } = await createGoogleCredential(user, brand)

  expect(credential.type).to.be.equal('google_credential')
  expect(credential.user).to.be.equal(user.id)
  expect(credential.brand).to.be.equal(brand.id)
  expect(credential.email).to.be.equal(body.profile.emailAddress)
  expect(credential.access_token).to.be.equal(body.tokens.access_token)

  googleCredential = credential
}

async function setup() {
  user  = await User.getByEmail('test@rechat.com')
  brand = await BrandHelper.create({
    roles: { Admin: [user.id] },
    contexts: [],
    checklists: []
  })

  await createCredential()

  Context.set({ user, brand, googleCredential })
}

async function upsert(jobName, status) {
  const result = await UsersJob.upsertByGoogleCredential(googleCredential, jobName, status)

  const id = result[0].id

  expect(result.length).to.not.be.equal(0)
  expect(id).to.not.be.equal(null)

  return id
}

async function create() {
  const jobName = 'calendar'
  const status  = 'pending'

  const id = await upsert(jobName, status)

  expect(id).to.not.be.equal(null)

  return id
}


async function get() {
  const id = await create()
  const record = await UsersJob.get(id)

  expect(record.type).to.be.equal('users_jobs')
  expect(record.status).to.be.equal('pending')
  expect(record.google_credential).to.be.equal(googleCredential.id)
  expect(record.microsoft_credential).to.be.equal(null)
  expect(record.deleted_at).to.be.equal(null)
}

async function deleteById() {
  const id = await create()

  const before = await UsersJob.get(id)
  expect(before.deleted_at).to.be.equal(null)

  await UsersJob.deletebyId(id)

  const after = await UsersJob.get(id)
  expect(after.deleted_at).to.not.be.equal(null)
}


describe('Users Jobs - Google', () => {
  createContext()
  beforeEach(setup)

  it('should return a record by id', get)
  it('should delete a record by id', deleteById)
})