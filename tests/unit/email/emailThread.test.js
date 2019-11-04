/*
const { expect } = require('chai')
const { createContext } = require('../helper')

const Context             = require('../../../lib/models/Context')
const User                = require('../../../lib/models/User')
const BrandHelper         = require('../brand/helper')
const GoogleCredential    = require('../../../lib/models/Google/credential')
// const GoogleMessage       = require('../../../lib/models/Google/message')
// const MicrosoftCredential = require('../../../lib/models/Microsoft/credential')
// const MicrosoftMessage    = require('../../../lib/models/Microsoft/message')
// const ThreadMessage       = require('../../../lib/models/Email/threadMessage')

let user, brand


async function setup() {
  user  = await User.getByEmail('test@rechat.com')
  brand = await BrandHelper.create({ roles: { Admin: [user.id] } })

  Context.set({ user, brand })
}


async function createCredentials() {
  const gBody = require('../google/data/google_credential')
  const mBody = require('../microsoft/data/microsoft_credential')
  
  gBody.user  = user.id
  gBody.brand = brand.id
  
  mBody.user  = user.id
  mBody.brand = brand.id


  const gCredentialId    = await GoogleCredential.create(gBody)
  const googleCredential = await GoogleCredential.get(gCredentialId)
  expect(googleCredential.type).to.be.equal('googlr_credential')

  const mCredentialId = await MicrosoftCredential.create(mBody)
  const microsoftCredential   = await MicrosoftCredential.get(mCredentialId)
  expect(microsoftCredential.type).to.be.equal('microsoft_credential')

  return {
    googleCredential,
    microsoftCredential
  }
}

async function createMessages() {
  const { googleCredential, microsoftCredential } = await createCredentials()
}

async function checkByThread() {
  // threadKey, user, brand
  const createdCredential = await create()
  const updatedCredential = await GoogleCredential.publicize(createdCredential)

}

async function getByThread() {
  // threadKey
  const createdCredential = await create()
  const updatedCredential = await GoogleCredential.publicize(createdCredential)

}


describe('Google', () => {
  describe('Google Account', () => {
    createContext()
    beforeEach(setup)

    it('should handle check-by-thread', checkByThread)
    it('should return an array of messages', getByThread)
  })
})
*/