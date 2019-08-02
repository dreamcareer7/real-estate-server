const { expect }        = require('chai')
const { createContext } = require('../helper')

const Context             = require('../../../lib/models/Context')
const User                = require('../../../lib/models/User')
const BrandHelper         = require('../brand/helper')
const MicrosoftCredential = require('../../../lib/models/Microsoft/credential')
const MicrosoftMessage    = require('../../../lib/models/Microsoft/message')


const microsoft_messages_offline = require('./data/microsoft_messages.json')

let user, brand

const microsoft_details = {
  address_1: 'rechat-test@outlook.com',
  tokens_1: {
    access_token: 'GlsSB5gTTkynEx16V7EnNexoVj15u.....',
    refresh_token: 'OmJrvcRpDBsWgY0ixn2GOW0kDSHMs9LxhpTA',
    id_token: 'xxxxxxxxxxxxxxxxxxxx',
    expires_in: new Date().getTime(),
    ext_expires_in: new Date().getTime(),
    scope: 'openid offline_access profile email User.Read Contacts.Read Mail.Read'
  },

  address_2: 'rechat-test-2@outlook.com',
  tokens_2: {
    access_token: 'GlsUBzA2jx8dx_keCJver96nMm.....',
    refresh_token: 'A9yVvz8OVLUro8iKTcvoCoXo7Pa6pajnviTBgD2gdqQQtiIeYi',
    id_token: 'xxxxxxxxxxxxxxxxxxxx',
    expires_in: new Date().getTime(),
    ext_expires_in: new Date().getTime(),
    scope: 'openid offline_access profile email User.Read Contacts.Read Mail.Read'
  },
}


async function setup() {
  user  = await User.getByEmail('test@rechat.com')
  brand = await BrandHelper.create({ roles: { Admin: [user.id] } })

  Context.set({ user, brand })
}

async function createMicrosoftCredential() {
  const body = {
    user: user.id,
    brand: brand.id,

    profile: {
      email: 'rechat-test@outlook.com',
      remote_id: '432ea353e4efa7f6',
      displayName: 'Saeed Vayghani',
      firstName: 'Saeed',
      lastName: 'Vayghani',
      photo: 'https://outlook.com/...'  
    },

    tokens: microsoft_details.tokens_1,

    scope: microsoft_details.scope
  }

  const credentialId = await MicrosoftCredential.create(body)
  const credential   = await MicrosoftCredential.get(credentialId)

  expect(credential.type).to.be.equal('microsoft_credential')
  expect(credential.user).to.be.equal(user.id)
  expect(credential.brand).to.be.equal(brand.id)
  expect(credential.email).to.be.equal(body.profile.email)
  expect(credential.access_token).to.be.equal(body.tokens.access_token)

  return credential
}



describe('Microsoft', () => {
  describe('Microsoft Messages', () => {
    createContext()
    beforeEach(setup)

    // it('should create some microsoft-messages', create)
    // it('should return microsoft-message by messages_id', getByMessageId)
    // it('should handle failure of microsoft-contact get by messages_id', getByMessageIdFailed)
    // it('should return number of messages of specific credential', getGCredentialMessagesNum)
  })
})