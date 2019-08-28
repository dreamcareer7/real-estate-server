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
  const scopes   = ['contacts.readonly']

  const authLinkRecord     = await GoogleAuthLink.requestGmailAccess(user.id, brand.id, scopes, redirect)
  const authLinkRecord_alt = await GoogleAuthLink.requestGmailAccess(user.id, brand.id, scopes)

  expect(authLinkRecord.url).to.be.not.null
  expect(authLinkRecord_alt.url).to.be.not.null

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

async function grantAccessFailedByBadScope() {
  const data_1 = {
    scope: 'email profilex',
    state: 'user::brand::redirect',
    code: 'xxx'
  }

  const data_2 = {
    scope: 'emailx profile',
    state: 'user::brand::redirect',
    code: 'xxx'
  }

  const data_3 = {
    scope: 'emailx profilex',
    state: 'user::brand::redirect',
    code: 'xxx'
  }

  try {
    await GoogleAuthLink.grantAccess(data_1)
  } catch(ex) {
    expect(ex.message).to.be.equal('Google-Auth-Hook Insufficient-Permission')
  }

  try {
    await GoogleAuthLink.grantAccess(data_2)
  } catch(ex) {
    expect(ex.message).to.be.equal('Google-Auth-Hook Insufficient-Permission')
  }

  try {
    await GoogleAuthLink.grantAccess(data_3)
  } catch(ex) {
    expect(ex.message).to.be.equal('Google-Auth-Hook Insufficient-Permission')
  }
}

async function grantAccessFailedByBadState() {
  const data_1 = {
    scope: 'email profilex',
    state: 'user::brand',
    code: null
  }

  try {
    await GoogleAuthLink.grantAccess(data_1)
  } catch(ex) {
    expect(ex.message).to.be.equal('Google-Auth-Hook bad-state')
  }
}

async function grantAccessFailedByBadCode() {
  const data_1 = {
    scope: 'email profile',
    state: 'user::brand::redirect',
    code: null
  }

  try {
    await GoogleAuthLink.grantAccess(data_1)
  } catch(ex) {
    expect(ex.message).to.be.equal('Google-Auth-Hook bad-code')
  }
}


describe('Google', () => {
  describe('Google Auth Link', () => {
    createContext()
    beforeEach(setup)

    it('should create a google auth link', requestGmailAccess)
    it('should handle duplicate create-google-auth-link request', duplicateRequestGmailAccess)

    it('should handle failed grantAccess cause of bad scope', grantAccessFailedByBadScope)
    it('should handle failed grantAccess cause of bad state', grantAccessFailedByBadState)
    it('should handle failed grantAccess cause of bad code', grantAccessFailedByBadCode)
  })
})