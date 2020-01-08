const { expect } = require('chai')
const { createContext } = require('../helper')

const Context             = require('../../../lib/models/Context')
const User                = require('../../../lib/models/User')
const BrandHelper         = require('../brand/helper')
const ThreadMessage       = require('../../../lib/models/Email/thread')
const GoogleMessage       = require('../../../lib/models/Google/message')
// const MicrosoftCredential = require('../../../lib/models/Microsoft/credential')
// const MicrosoftMessage    = require('../../../lib/models/Microsoft/message')

const { createGoogleMessages } = require('../google/helper')

let user, brand


async function setup() {
  user  = await User.getByEmail('test@rechat.com')
  brand = await BrandHelper.create({ roles: { Admin: [user.id] } })

  Context.set({ user, brand })
}

async function create() {
  const { createdMessages, credential } = await createGoogleMessages(user, brand)

  for (const createdGoogleMessage of createdMessages) {
    expect(createdGoogleMessage.google_credential).to.be.equal(credential.id)
    
    const googleMessage = await GoogleMessage.getByMessageId(createdGoogleMessage.message_id, createdGoogleMessage.google_credential)

    expect(googleMessage.type).to.be.equal('google_message')
    expect(googleMessage.recipients.length).not.to.be.equal(0)
  }

  return createdMessages
}

async function hasAccess() {
  const messages = await create()
  const message  = await GoogleMessage.getAsThreadMember(messages[1].google_credential, messages[1].message_id)

  const thread = await ThreadMessage.get(message.thread_key)

  try {
    await ThreadMessage.hasAccess(message.id, user.id, brand.id)
  } catch (ex) {
    expect(ex.message).to.be.equal(`EmailThread ${message.id} not found.`)
  }

  const status = await ThreadMessage.hasAccess(thread.id, user.id, brand.id)
  expect(status).to.be.equal(true)

  const status_1 = await ThreadMessage.hasAccess(thread.id, user.id, user.id)
  expect(status_1).to.be.equal(false)
}

async function get() {
  const messages  = await create()
  const message_1 = await GoogleMessage.getAsThreadMember(messages[0].google_credential, messages[0].message_id)
  const message_2 = await GoogleMessage.getAsThreadMember(messages[1].google_credential, messages[1].message_id)

  const thread_1 = await ThreadMessage.get(message_1.thread_key)
  expect(thread_1.message_count).to.be.equal(1)
  expect(thread_1.google_credential).to.be.equal(messages[0].google_credential)
  expect(thread_1.microsoft_credential).to.be.equal(null)
  expect(thread_1.user).to.be.equal(user.id)
  expect(thread_1.brand).to.be.equal(brand.id)
  expect(thread_1.type).to.be.equal('email_thread')

  const thread_2 = await ThreadMessage.get(message_2.thread_key)
  expect(thread_2.message_count).to.be.equal(2)
  expect(thread_1.google_credential).to.be.equal(messages[1].google_credential)
  expect(thread_1.microsoft_credential).to.be.equal(null)
}



describe('Google', () => {
  describe('Email Threads', () => {
    createContext()
    beforeEach(setup)

    it('should handle access check', hasAccess)
    it('should handle get thread', get)
  })
})