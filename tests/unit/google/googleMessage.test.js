const { expect } = require('chai')
const { createContext } = require('../helper')

const Context          = require('../../../lib/models/Context')
const User             = require('../../../lib/models/User')
const BrandHelper      = require('../brand/helper')
const GoogleCredential = require('../../../lib/models/Google/credential')
const GoogleMessage    = require('../../../lib/models/Google/message')

const { parser } = require('../../../lib/models/Google/workers/gmail/common')


const google_messages_offline = require('./data/google_messages.json')

let user, brand

const google_details = {
  address_1: 'saeed.uni68@gmail.com',
  tokens_1: {
    access_token: 'ya29.GlsSB5gTTkynEx16V7EnNexoVj15u.....',
    refresh_token: '1/mvS9GZgOmJrvcRpDBsWgY0ixn2GOW0kDSHMs9LxhpTA',
    scope: 'https://www.googleapis.com/auth/contacts.readonly',
    token_type: 'Bearer',
    expiry_date: 1558581374
  },
  
  address_2: 'saeed@rechat.com',
  tokens_2: {
    access_token: 'ya29.GlsUBzA2jx8dx_keCJver96nMm.....',
    refresh_token: '1/wf3VTMwGFDqnDwA9yVvz8OVLUro8iKTcvoCoXo7Pa6pajnviTBgD2gdqQQtiIeYi',
    token_type: 'Bearer',
    scope: 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/contacts.readonly',
    expiry_date: 1558581374
  },

  scope: [
    'email',
    'profile',
    'openid',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/contacts.readonly'
  ]
}


async function setup() {
  user  = await User.getByEmail('test@rechat.com')
  brand = await BrandHelper.create({ roles: { Admin: [user.id] } })

  Context.set({ user, brand })
}

async function createGoogleCredential() {
  const body = {
    user: user.id,
    brand: brand.id,

    profile: {
      emailAddress: google_details.address_1,
      resourceName: 'people/101097287757226633710',
      displayName: 'Saeed Vayghani',
      firstName: 'Saeed',
      lastName: 'Vayghani',
      photo: 'https://lh5.googleusercontent.com/...',
  
      messagesTotal: 100,
      threadsTotal: 100,
      historyId: 100
    },

    tokens: google_details.tokens_1,

    scope: google_details.scope
  }

  const credentialId = await GoogleCredential.create(body)
  const credential   = await GoogleCredential.get(credentialId)

  expect(credential.user).to.be.equal(user.id)
  expect(credential.brand).to.be.equal(brand.id)
  expect(credential.email).to.be.equal(body.profile.emailAddress)
  expect(credential.access_token).to.be.equal(body.tokens.access_token)

  return credential
}

async function create() {
  const credential = await createGoogleCredential()

  const googleMessages = []

  for (const message of google_messages_offline) {

    const { recipientsArr, attachments, internetMessageId, inReplyTo, subject, from, to, cc, bcc } = parser(message)

    googleMessages.push({
      google_credential: credential.id,
      message_id: message.id,
      thread_id: message.threadId,
      history_id: message.historyId,
      internet_message_id: internetMessageId,
      in_reply_to: inReplyTo,
      recipients: `{${recipientsArr.join(',')}}`,
      in_bound: (message.labelIds.includes('SENT')) ? false : true,

      subject: subject,
      has_attachments: (attachments.length > 0) ? true : false,
      attachments: JSON.stringify(attachments),

      '"from"': JSON.stringify(from),
      '"to"': JSON.stringify(to),
      cc: JSON.stringify(cc),
      bcc: JSON.stringify(bcc),

      message_created_at: new Date(Number(message.internalDate)).getTime(),
      message_date: new Date(Number(message.internalDate)).toISOString(),

      data: JSON.stringify(message)
    })
  }

  const createdMessages = await GoogleMessage.create(googleMessages)

  for (const createdGoogleMessage of createdMessages) {
    expect(createdGoogleMessage.google_credential).to.be.equal(credential.id)
    
    const googleMessage = await GoogleMessage.get(createdGoogleMessage.message_id, createdGoogleMessage.google_credential)

    expect(googleMessage.type).to.be.equal('google_messages')
    expect(googleMessage.deleted_at).to.be.equal(null)
    expect(googleMessage.recipients.length).not.to.be.equal(0)
  }

  return createdMessages
}

async function getByMessageId() {
  const googleMessages = await create()

  for (const gMessage of googleMessages) {

    const googleMessage = await GoogleMessage.get(gMessage.message_id, gMessage.google_credential)

    expect(googleMessage.type).to.be.equal('google_messages')
    expect(googleMessage.google_credential).to.be.equal(gMessage.google_credential)
    expect(googleMessage.recipients.length).not.to.be.equal(0)
    expect(googleMessage.message_id).to.be.equal(gMessage.message_id)
  }
}

async function getByMessageIdFailed() {
  const bad_id = user.id

  const googleMessage = await GoogleMessage.get(bad_id, bad_id)

  expect(googleMessage).to.be.equal(null)
}

async function getGCredentialMessagesNum() {
  const googleMessages = await create()

  const result = await GoogleMessage.getGCredentialMessagesNum(googleMessages[0]['google_credential'])

  expect(result[0]['count']).to.be.equal(googleMessages.length)
}



describe('Google', () => {
  describe('Google Messages', () => {
    createContext()
    beforeEach(setup)

    it('should create some google-messages', create)
    it('should return google-message by messages_id', getByMessageId)
    it('should handle failure of google-contact get by messages_id', getByMessageIdFailed)
    it('should return number of messages of specific credential', getGCredentialMessagesNum)
  })
})