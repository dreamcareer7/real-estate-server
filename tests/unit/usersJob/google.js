const uuid       = require('uuid')
const { expect } = require('chai')
const { createContext } = require('../helper')

const Context       = require('../../../lib/models/Context')
const User          = require('../../../lib/models/User/get')
const BrandHelper   = require('../brand/helper')
const UsersJob      = require('../../../lib/models/UsersJob')

const { createGoogleCredential } = require('../google/helper')

const metadata = { contact_address: 'contact_address' }

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
  const result = await UsersJob.upsertByGoogleCredential(googleCredential, jobName, status, metadata)

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
  expect(record.metadata).to.be.deep.equal(metadata)
  expect(record.google_credential).to.be.equal(googleCredential.id)
  expect(record.microsoft_credential).to.be.equal(null)
  expect(record.deleted_at).to.be.equal(null)
}

async function getFailed() {
  const fakeId = uuid.v4()

  try {
    await UsersJob.get(fakeId)
  } catch (ex) {
    expect(ex.message).to.be.equal(`UsersJob by id ${fakeId} not found.`)
  }
}

async function getByGoogleCredential() {
  await create()
  const record = await UsersJob.getByGoogleCredential(googleCredential.id, 'calendar')

  expect(record.type).to.be.equal('users_jobs')
  expect(record.status).to.be.equal('pending')
  expect(record.google_credential).to.be.equal(googleCredential.id)
  expect(record.microsoft_credential).to.be.equal(null)
  expect(record.deleted_at).to.be.equal(null)
}

async function deleteByGoogleCredential() {
  const id = await create()
  await UsersJob.deleteByGoogleCredential(googleCredential.id)

  const record = await UsersJob.get(id)

  expect(record.type).to.be.equal('users_jobs')
  expect(record.status).to.be.equal(null)
  expect(record.google_credential).to.be.equal(googleCredential.id)
  expect(record.microsoft_credential).to.be.equal(null)
  expect(record.deleted_at).to.not.be.equal(null)
}

async function deleteByGoogleCredentialAndJob() {
  const id = await create()
  await UsersJob.deleteByGoogleCredentialAndJob(googleCredential.id, 'calendar')

  const record = await UsersJob.get(id)

  expect(record.type).to.be.equal('users_jobs')
  expect(record.status).to.be.equal('canceled')
  expect(record.google_credential).to.be.equal(googleCredential.id)
  expect(record.microsoft_credential).to.be.equal(null)
  expect(record.deleted_at).to.not.be.equal(null)
}

async function deleteByGoogleCredentialAndJobFailed() {
  const id = await create()
  await UsersJob.deleteByGoogleCredentialAndJob(googleCredential.id, 'contacts')

  const record = await UsersJob.get(id)

  expect(record.type).to.be.equal('users_jobs')
  expect(record.status).to.be.equal('pending')
  expect(record.google_credential).to.be.equal(googleCredential.id)
  expect(record.microsoft_credential).to.be.equal(null)
  expect(record.deleted_at).to.be.equal(null)
}

async function forceSyncByGoogleCredential() {
  const id = await create()
  await UsersJob.forceSyncByGoogleCredential(googleCredential.id, 'calendar')

  const record = await UsersJob.get(id)

  expect(record.type).to.be.equal('users_jobs')
  expect(record.status).to.be.equal('waiting')
}

async function lockByGoogleCredential() {
  const id = await create()
  const record = await UsersJob.get(id)
  
  await UsersJob.lockByGoogleCredential(record.google_credential, record.jobName)
  await UsersJob.checkLockByGoogleCredential(record.google_credential, record.jobName)
}

async function postponeByGoogleCredential() {
  const id = await create()
  
  const before = await UsersJob.get(id)

  expect(before.type).to.be.equal('users_jobs')
  expect(before.resume_at).to.be.equal(null)

  await UsersJob.postponeByGoogleCredential(googleCredential.id, 'calendar', '5 minutes')
  
  const after = await UsersJob.get(id)
  
  expect(after.type).to.be.equal('users_jobs')
  expect(after.resume_at).to.not.be.equal(null)
}



describe('Users Jobs - Google', () => {
  createContext()
  beforeEach(setup)

  it('should upsert by credential', create)
  it('should return a record by id', get)
  it('should handle an exception in get by id', getFailed)
  it('should return a record by credential and job name', getByGoogleCredential)
  it('should delete by Google credential', deleteByGoogleCredential)
  it('should delete by Google credential and job name', deleteByGoogleCredentialAndJob)
  it('should not delete by Google credential and job name', deleteByGoogleCredentialAndJobFailed)
  it('should sync by Google credential and job name', forceSyncByGoogleCredential)
  it('should lock anc check a record', lockByGoogleCredential)
  it('should postpone by Google credential and job name', postponeByGoogleCredential)
})