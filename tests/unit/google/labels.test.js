const uuid       = require('uuid')
const { expect } = require('chai')
const { createContext } = require('../helper')

const Context          = require('../../../lib/models/Context')
const User             = require('../../../lib/models/User/get')
const BrandHelper      = require('../brand/helper')
const GoogleMailLabel  = require('../../../lib/models/Google/mail_labels')

const { createGoogleCredential } = require('./helper')

const labels = require('./data/mail_label.json')

let user, brand



async function setup() {
  user  = await User.getByEmail('test@rechat.com')
  brand = await BrandHelper.create({
    roles: { Admin: [user.id] },
    contexts: [],
    checklists: []
  })

  Context.set({ user, brand })
}

async function create() {
  const { credential, body } = await createGoogleCredential(user, brand)

  expect(credential.type).to.be.equal('google_credential')
  expect(credential.user).to.be.equal(user.id)
  expect(credential.brand).to.be.equal(brand.id)
  expect(credential.email).to.be.equal(body.profile.emailAddress)
  expect(credential.access_token).to.be.equal(body.tokens.access_token)

  return credential
}

async function upsertLabels() {
  const credential = await create()
  const id = await GoogleMailLabel.upsertLabels(credential.id, labels)

  expect(id).to.not.be.equal(null)

  return id
}

async function get() {
  const id = await upsertLabels()
  const result = await GoogleMailLabel.get(id)

  expect(id).to.be.equal(result.id)
}

async function getFailed() {
  const result = await GoogleMailLabel.get(uuid.v4())

  expect(result).to.be.equal(null)
}

async function getByCredential() {
  const id = await upsertLabels()
  const result = await GoogleMailLabel.get(id)
  const byCredential = await GoogleMailLabel.getByCredential(result.credential)

  expect(id).to.be.equal(result.id)
  expect(result.id).to.be.equal(byCredential.id)
  expect(result.credential).to.be.equal(byCredential.credential)
}

async function getByCredentialFailed() {
  const result = await GoogleMailLabel.getByCredential(uuid.v4())

  expect(result).to.be.equal(null)
}


describe('Google', () => {
  describe('Google Mail Labels', () => {
    createContext()
    beforeEach(setup)

    it('should upsert some lables', upsertLabels)
    it('should return a mail_labels object', get)
    it('should handle the failure of get', getFailed)
    it('should return a mail_labels object by credential', getByCredential)
    it('should handle the failure of getByCredential', getByCredentialFailed)
  })
})