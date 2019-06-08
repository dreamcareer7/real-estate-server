const { expect }        = require('chai')
const { createContext } = require('../helper')

const Context        = require('../../../lib/models/Context')
const User           = require('../../../lib/models/User')
const BrandHelper    = require('../brand/helper')
const GoogleAuthLink = require('../../../lib/models/Google/auth_link')


let user, brand


async function setup() {
  user  = await User.getByEmail('test@rechat.com')
  brand = await BrandHelper.create({ roles: { Admin: [user.id] } })

  Context.set({ user, brand })
}

async function requestGmailAccess() {
  const redirect = 'http://localhost:3078/dashboard/contacts/'
  const authLinkRecord = await GoogleAuthLink.requestGmailAccess(user.id, brand.id, redirect)
  
  expect(authLinkRecord.url).to.be.not.null

  return authLinkRecord
}

async function duplicateRequestGmailAccess() {
  const redirect = 'http://localhost:3078/dashboard/contacts/'

  const authUrl_1 = await GoogleAuthLink.requestGmailAccess(user.id, brand.id, redirect)
  const authUrl_2 = await GoogleAuthLink.requestGmailAccess(user.id, brand.id, redirect)
  
  expect(authUrl_1).to.be.not.null
  expect(authUrl_2).to.be.not.null
  expect(authUrl_2).to.be.equal(authUrl_2)
}

async function getByLink() {
  const authLinkRecord = await requestGmailAccess()
  const gmailAuthLink  = await GoogleAuthLink.getByLink(authLinkRecord.url)
  
  expect(authLinkRecord.url).to.be.equal(gmailAuthLink.url)
}

async function getByUser() {
  await requestGmailAccess()
  const gmailAuthLink = await GoogleAuthLink.getByUser(user.id, brand.id)

  expect(gmailAuthLink.user).to.be.equal(user.id)
  expect(gmailAuthLink.brand).to.be.equal(brand.id)
}


describe('Google', () => {
  describe('Google Auth Link', () => {
    createContext()
    beforeEach(setup)

    it('should create a google auth link', requestGmailAccess)
    it('should handle duplicate create-google-auth-link request', duplicateRequestGmailAccess)
    it('should return auth-link record by link', getByLink)
    it('should return auth-link record by user', getByUser)
  })
})