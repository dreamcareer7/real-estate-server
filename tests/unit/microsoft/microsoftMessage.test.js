const uuid = require('uuid')
const { expect }        = require('chai')
const { createContext } = require('../helper')

const Context             = require('../../../lib/models/Context')
const User                = require('../../../lib/models/User')
const BrandHelper         = require('../brand/helper')
const MicrosoftCredential = require('../../../lib/models/Microsoft/credential')
const MicrosoftMessage    = require('../../../lib/models/Microsoft/message')

const { generateMMesssageRecord } = require('../../../lib/models/Microsoft/workers/messages/common')



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

async function create() {
  const credential = await createMicrosoftCredential()

  const microsoftMessages = []

  for ( const message of microsoft_messages_offline ) {
    microsoftMessages.push(generateMMesssageRecord(credential, message))
  }

  const createdMessages = await MicrosoftMessage.create(microsoftMessages)

  for (const createdMicrosoftMessage of createdMessages) {
    expect(createdMicrosoftMessage.microsoft_credential).to.be.equal(credential.id)
    
    const microsoftMessage = await MicrosoftMessage.get(createdMicrosoftMessage.message_id, createdMicrosoftMessage.microsoft_credential)

    console.log(microsoftMessage.recipients)

    expect(microsoftMessage.type).to.be.equal('microsoft_message')
    expect(microsoftMessage.deleted_at).to.be.equal(null)
    expect(microsoftMessage.recipients.length).not.to.be.equal(0)
  }

  return createdMessages
}

async function getByMessageId() {
  const microsoftMessages = await create()

  for (const mMessage of microsoftMessages) {

    const microsoftMessage = await MicrosoftMessage.get(mMessage.message_id, mMessage.microsoft_credential)

    expect(microsoftMessage.type).to.be.equal('microsoft_message')
    expect(microsoftMessage.microsoft_credential).to.be.equal(mMessage.microsoft_credential)
    expect(microsoftMessage.recipients.length).not.to.be.equal(0)
    expect(microsoftMessage.message_id).to.be.equal(mMessage.message_id)
  }
}

async function getByMessageIdFailed() {
  const bad_id = user.id

  const microsoftMessage = await MicrosoftMessage.get(bad_id, bad_id)

  expect(microsoftMessage).to.be.equal(null)
}

async function getMCredentialMessagesNum() {
  const microsoftMessages = await create()

  const result = await MicrosoftMessage.getMCredentialMessagesNum(microsoftMessages[0]['microsoft_credential'])

  expect(result[0]['count']).to.be.equal(microsoftMessages.length)
}

async function downloadAttachmentFailed() {
  const microsoftMessages = await create()
  const microsoftMessage_min = microsoftMessages[0]

  const microsoftMessage = await MicrosoftMessage.get(microsoftMessage_min.message_id, microsoftMessage_min.microsoft_credential)

  const bad_id = uuid.v4()

  try {
    await MicrosoftMessage.downloadAttachment(bad_id, bad_id, bad_id)
  } catch(ex) {
    expect(ex.message).to.be.equal(`Microsoft-Credential ${bad_id} not found`)
  }

  try {
    await MicrosoftMessage.downloadAttachment(microsoftMessage.microsoft_credential, bad_id, bad_id)
  } catch(ex) {
    expect(ex.message).to.be.equal('Microsoft-Client failed!')
  }
}


describe('Microsoft', () => {
  describe('Microsoft Messages', () => {
    createContext()
    beforeEach(setup)

    it('should create some microsoft-messages', create)
    it('should return microsoft-message by messages_id', getByMessageId)
    it('should handle failure of microsoft-contact get by messages_id', getByMessageIdFailed)
    it('should return number of messages of specific credential', getMCredentialMessagesNum)

    it('should handle failure of downloadAttachment', downloadAttachmentFailed)
  })
})