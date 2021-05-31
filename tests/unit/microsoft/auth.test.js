const { expect }        = require('chai')
const { createContext } = require('../helper')

const Context           = require('../../../lib/models/Context')
const User              = require('../../../lib/models/User/get')
const BrandHelper       = require('../brand/helper')
const MicrosoftAuthLink = require('../../../lib/models/Microsoft/auth_link')


let user, brand


async function setup() {
  user  = await User.getByEmail('test@rechat.com')
  brand = await BrandHelper.create({ roles: { Admin: [user.id] } })

  Context.set({ user, brand })
}

async function requestMicrosoftAccess() {
  const redirect = 'http://localhost:3078/dashboard/contacts/'
  const scopes   = []

  const authLinkRecord = await MicrosoftAuthLink.requestMicrosoftAccess(user.id, brand.id, scopes, redirect)
  
  expect(authLinkRecord.url).to.be.not.null

  return authLinkRecord
}

async function duplicateRequestGmailAccess() {
  const redirect = 'http://localhost:3078/dashboard/contacts/'
  const scopes   = []

  const authUrl_1 = await MicrosoftAuthLink.requestMicrosoftAccess(user.id, brand.id, scopes, redirect)
  const authUrl_2 = await MicrosoftAuthLink.requestMicrosoftAccess(user.id, brand.id, scopes, redirect)
  
  expect(authUrl_1).to.be.not.null
  expect(authUrl_2).to.be.not.null
  expect(authUrl_2).to.be.equal(authUrl_2)
}

async function grantAccessFailedByBadState() {
  const data_1 = {
    state: 'user::brand',
    code: null
  }

  try {
    await MicrosoftAuthLink.grantAccess(data_1)
  } catch(ex) {
    expect(ex.message).to.be.equal('Microsoft-Auth-Hook-Failed! Bad State')
  }
}

async function grantAccessFailedByBadCode() {
  const data_1 = {
    state: 'user::brand::redirect',
    code: null
  }

  try {
    await MicrosoftAuthLink.grantAccess(data_1)
  } catch(ex) {
    expect(ex.message).to.be.equal('Microsoft-Auth-Hook-Failed! Bad Code')
  }
}



describe('Microsoft', () => {
  describe('Microsoft Auth Link', () => {
    createContext()
    beforeEach(setup)

    it('should create a microsoft auth link', requestMicrosoftAccess)
    it('should handle duplicate create-microsoft-auth-link request', duplicateRequestGmailAccess)

    it('should handle failed grantAccess cause of bad state', grantAccessFailedByBadState)
    it('should handle failed grantAccess cause of bad code', grantAccessFailedByBadCode)
  })
})
