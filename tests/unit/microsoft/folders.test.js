const uuid       = require('uuid')
const { expect } = require('chai')
const { createContext } = require('../helper')

const Context          = require('../../../lib/models/Context')
const User             = require('../../../lib/models/User/get')
const BrandHelper      = require('../brand/helper')
const MicrosoftMailFolder = require('../../../lib/models/Microsoft/mail_folders')

const { createMicrosoftCredential } = require('./helper')

const folders = require('./data/mail_folders.json')

let user, brand



async function setup() {
  user  = await User.getByEmail('test@rechat.com')
  brand = await BrandHelper.create({ roles: { Admin: [user.id] } })

  Context.set({ user, brand })
}

async function create() {
  const { credential, body } = await createMicrosoftCredential(user, brand)

  expect(credential.type).to.be.equal('microsoft_credential')
  expect(credential.user).to.be.equal(user.id)
  expect(credential.brand).to.be.equal(brand.id)
  expect(credential.email).to.be.equal(body.profile.email)
  expect(credential.access_token).to.be.equal(body.tokens.access_token)

  return credential
}

async function upsertFolders() {
  const credential = await create()
  const id = await MicrosoftMailFolder.upsertFolders(credential.id, folders)

  expect(id).to.not.be.equal(null)

  return id
}

async function get() {
  const id = await upsertFolders()
  const result = await MicrosoftMailFolder.get(id)

  expect(id).to.be.equal(result.id)
}

async function getFailed() {
  const result = await MicrosoftMailFolder.get(uuid.v4())

  expect(result).to.be.equal(null)
}

async function getByCredential() {
  const id = await upsertFolders()
  const result = await MicrosoftMailFolder.get(id)
  const byCredential = await MicrosoftMailFolder.getByCredential(result.credential)

  expect(id).to.be.equal(result.id)
  expect(result.id).to.be.equal(byCredential.id)
  expect(result.credential).to.be.equal(byCredential.credential)
}

async function getByCredentialFailed() {
  const result = await MicrosoftMailFolder.getByCredential(uuid.v4())

  expect(result).to.be.equal(null)
}


describe('Microsoft', () => {
  describe('Microsoft Mail Folder', () => {
    createContext()
    beforeEach(setup)

    it('should upsert some folders', upsertFolders)
    it('should return a mail_folders object', get)
    it('should handle the failure of get', getFailed)
    it('should return a mail_folders object by credential', getByCredential)
    it('should handle the failure of getByCredential', getByCredentialFailed)
  })
})