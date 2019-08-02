const { expect }        = require('chai')
const { createContext } = require('../helper')

const Context           = require('../../../lib/models/Context')
const User              = require('../../../lib/models/User')
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
  const authLinkRecord = await MicrosoftAuthLink.requestMicrosoftAccess(user.id, brand.id, redirect)
  
  expect(authLinkRecord.url).to.be.not.null

  return authLinkRecord
}

async function duplicateRequestGmailAccess() {
  const redirect = 'http://localhost:3078/dashboard/contacts/'

  const authUrl_1 = await MicrosoftAuthLink.requestMicrosoftAccess(user.id, brand.id, redirect)
  const authUrl_2 = await MicrosoftAuthLink.requestMicrosoftAccess(user.id, brand.id, redirect)
  
  expect(authUrl_1).to.be.not.null
  expect(authUrl_2).to.be.not.null
  expect(authUrl_2).to.be.equal(authUrl_2)
}



describe('Microsoft', () => {
  describe('Microsoft Auth Link', () => {
    createContext()
    beforeEach(setup)

    it('should create a microsoft auth link', requestMicrosoftAccess)
    it('should handle duplicate create-microsoft-auth-link request', duplicateRequestGmailAccess)
  })
})