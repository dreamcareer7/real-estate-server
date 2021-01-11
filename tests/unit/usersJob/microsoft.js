const uuid       = require('uuid')
const { expect } = require('chai')
const { createContext } = require('../helper')

const Context       = require('../../../lib/models/Context')
const User          = require('../../../lib/models/User/get')
const BrandHelper   = require('../brand/helper')
const UsersJob      = require('../../../lib/models/UsersJob')

const { createMicrosoftCredential } = require('../microsoft/helper')

const metadata = { contact_address: 'contact_address' }


let user, brand, microsoftCredential


async function createCredential() {
  const { credential, body } = await createMicrosoftCredential(user, brand)

  expect(credential.type).to.be.equal('microsoft_credential')
  expect(credential.user).to.be.equal(user.id)
  expect(credential.brand).to.be.equal(brand.id)
  expect(credential.email).to.be.equal(body.profile.email)
  expect(credential.access_token).to.be.equal(body.tokens.access_token)

  microsoftCredential = credential
}

async function setup() {
  user  = await User.getByEmail('test@rechat.com')
  brand = await BrandHelper.create({
    roles: { Admin: [user.id] },
    contexts: [],
    checklists: []
  })

  await createCredential()

  Context.set({ user, brand, microsoftCredential })
}

async function upsert(jobName, status) {
  const result = await UsersJob.upsertByMicrosoftCredential(microsoftCredential, jobName, status, metadata, true)

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
  expect(record.microsoft_credential).to.be.equal(microsoftCredential.id)
  expect(record.google_credential).to.be.equal(null)
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

async function getByMicrosoftCredential() {
  await create()
  const record = await UsersJob.getByMicrosoftCredential(microsoftCredential.id, 'calendar')

  expect(record.type).to.be.equal('users_jobs')
  expect(record.status).to.be.equal('pending')
  expect(record.microsoft_credential).to.be.equal(microsoftCredential.id)
  expect(record.google_credential).to.be.equal(null)
  expect(record.deleted_at).to.be.equal(null)
}

async function deleteByMicrosoftCredential() {
  const id = await create()
  await UsersJob.deleteByMicrosoftCredential(microsoftCredential.id)

  const record = await UsersJob.get(id)

  expect(record.type).to.be.equal('users_jobs')
  expect(record.status).to.be.equal(null)
  expect(record.microsoft_credential).to.be.equal(microsoftCredential.id)
  expect(record.google_credential).to.be.equal(null)
  expect(record.deleted_at).to.not.be.equal(null)
}

async function deleteByMicrosoftCredentialAndJob() {
  const id = await create()
  await UsersJob.deleteByMicrosoftCredentialAndJob(microsoftCredential.id, 'calendar')

  const record = await UsersJob.get(id)

  expect(record.type).to.be.equal('users_jobs')
  expect(record.status).to.be.equal('canceled')
  expect(record.microsoft_credential).to.be.equal(microsoftCredential.id)
  expect(record.google_credential).to.be.equal(null)
  expect(record.deleted_at).to.not.be.equal(null)
}

async function deleteByMicrosoftCredentialAndJobFailed() {
  const id = await create()
  await UsersJob.deleteByMicrosoftCredentialAndJob(microsoftCredential.id, 'contacts')

  const record = await UsersJob.get(id)

  expect(record.type).to.be.equal('users_jobs')
  expect(record.status).to.be.equal('pending')
  expect(record.microsoft_credential).to.be.equal(microsoftCredential.id)
  expect(record.google_credential).to.be.equal(null)
  expect(record.deleted_at).to.be.equal(null)
}

async function forceSyncByMicrosoftCredential() {
  const id = await create()
  await UsersJob.forceSyncByMicrosoftCredential(microsoftCredential.id, 'calendar')

  const record = await UsersJob.get(id)

  expect(record.type).to.be.equal('users_jobs')
  expect(record.status).to.be.equal('waiting')
}

async function lockByMicrosoftCredential() {
  const id = await create()
  const record = await UsersJob.get(id)
  
  await UsersJob.lockByMicrosoftCredential(record.microsoft_credential, record.jobName)
  await UsersJob.checkLockByMicrosoftCredential(record.microsoft_credential, record.jobName)
}

async function postponeByMicrosoftCredential() {
  const id = await create()
  
  const before = await UsersJob.get(id)

  expect(before.type).to.be.equal('users_jobs')
  expect(before.resume_at).to.be.equal(null)

  await UsersJob.postponeByMicrosoftCredential(microsoftCredential.id, 'calendar', '5 minutes')
  
  const after = await UsersJob.get(id)
  
  expect(after.type).to.be.equal('users_jobs')
  expect(after.resume_at).to.not.be.equal(null)
}



describe('Users Jobs - Microsoft', () => {
  createContext()
  beforeEach(setup)

  it('should upsert by credential', create)
  it('should return a record by id', get)
  it('should handle an exception in get by id', getFailed)
  it('should return a record by credential and job name', getByMicrosoftCredential)
  it('should delete by Microsoft credential', deleteByMicrosoftCredential)
  it('should delete by Microsoft credential and job name', deleteByMicrosoftCredentialAndJob)
  it('should not delete by Microsoft credential and job name', deleteByMicrosoftCredentialAndJobFailed)
  it('should sync by Microsoft credential and job name', forceSyncByMicrosoftCredential)
  it('should lock anc check a record', lockByMicrosoftCredential)
  it('should postpone by Microsoft credential and job name', postponeByMicrosoftCredential)
})