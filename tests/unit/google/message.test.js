const uuid       = require('uuid')
const { expect } = require('chai')
const { createContext } = require('../helper')

const Context          = require('../../../lib/models/Context')
const User             = require('../../../lib/models/User')
const BrandHelper      = require('../brand/helper')
const GoogleMessage    = require('../../../lib/models/Google/message')

const { createGoogleMessages } = require('./helper')

let user, brand



async function setup() {
  user  = await User.getByEmail('test@rechat.com')
  brand = await BrandHelper.create({ roles: { Admin: [user.id] } })

  Context.set({ user, brand })
}

async function getByIdFailed() {
  try {
    await GoogleMessage.get(user.id)
  } catch(ex) {
    expect(ex.message).to.be.equal(`GoogleMessage ${user.id} not found.`)
  }
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

async function getByMessageId() {
  const googleMessages = await create()

  for (const gMessage of googleMessages) {

    const googleMessage = await GoogleMessage.getByMessageId(gMessage.message_id, gMessage.google_credential)

    expect(googleMessage.type).to.be.equal('google_message')
    expect(googleMessage.google_credential).to.be.equal(gMessage.google_credential)
    expect(googleMessage.recipients.length).not.to.be.equal(0)
    expect(googleMessage.message_id).to.be.equal(gMessage.message_id)
  }
}

async function getByMessageIdFailed() {
  const bad_id = user.id

  try {
    await GoogleMessage.getByMessageId(bad_id, bad_id)
  } catch(ex) {
    expect(ex.message).to.be.equal(`GoogleMessage ${bad_id} in credential ${bad_id} not found.`)
  }
}

async function getAsThreadMember() {
  const messages = await create()
  const message  = await GoogleMessage.getAsThreadMember(messages[0].google_credential, messages[0].message_id)

  expect(message.origin).to.be.equal('gmail')
  expect(message.owner).to.be.equal(messages[0].google_credential)
  expect(message.message_id).to.be.equal(messages[0].message_id)
  expect(message.thread_key).to.be.equal(messages[0].thread_key)
  expect(message.has_attachments).to.be.equal(true)
}

async function getAsThreadMemberFailed() {
  const message  = await GoogleMessage.getAsThreadMember(user.id, user.id)

  expect(message).to.be.equal(null)
}

async function getGCredentialMessagesNum() {
  const googleMessages = await create()

  const result = await GoogleMessage.getGCredentialMessagesNum(googleMessages[0]['google_credential'])

  expect(result[0]['count']).to.be.equal(googleMessages.length)
}

async function deleteByMessageIds() {
  const googleMessages = await create()

  for (const gMessage of googleMessages) {
    await GoogleMessage.deleteByMessageIds(gMessage.google_credential, [gMessage.message_id])
  }

  for (const gMessage of googleMessages) {
    const googleMessage = await GoogleMessage.getByMessageId(gMessage.message_id, gMessage.google_credential)

    expect(googleMessage.type).to.be.equal('google_message')
    expect(googleMessage.google_credential).to.be.equal(gMessage.google_credential)
    expect(googleMessage.deleted_at).not.to.be.equal(null)
  }
}

async function downloadAttachmentFailed() {
  const googleMessages = await create()
  const googleMessage_min = googleMessages[0]

  const googleMessage = await GoogleMessage.getByMessageId(googleMessage_min.message_id, googleMessage_min.google_credential)
  // const attachment = googleMessage.attachments[0]
  // await GoogleMessage.downloadAttachment(googleMessage.google_credential, googleMessage.message_id, attachment.id)

  const bad_id = uuid.v4()

  try {
    await GoogleMessage.downloadAttachment(bad_id, bad_id, bad_id)
  } catch(ex) {
    expect(ex.message).to.be.equal(`GoogleMessage ${bad_id} in credential ${bad_id} not found.`)
  }

  try {
    await GoogleMessage.downloadAttachment(googleMessage.google_credential, googleMessage.message_id, bad_id)
  } catch(ex) {
    expect(ex.message).to.be.equal('Gmail message\'s attachment not found!')
  }
}

async function getRemoteMessage() {
  const messages = await create()

  const gmailMessage = await GoogleMessage.getRemoteMessage(messages[0].google_credential, '16f80a53a53bd334')

  expect(gmailMessage.origin).to.be.equal('gmail')
  expect(gmailMessage.owner).to.be.equal(messages[0].google_credential)
  expect(gmailMessage.has_attachments).to.be.equal(true)
  expect(gmailMessage.attachments.length).to.be.equal(2)
  expect(gmailMessage.html_body).to.be.equal('This is the email body')

  return gmailMessage
}

async function updateIsRead() {
  const messages = await create()

  const message = await GoogleMessage.getAsThreadMember(messages[0].google_credential, messages[0].message_id)
  expect(message.is_read).to.be.equal(false)

  await GoogleMessage.updateIsRead(messages[0].id, true)
  
  const updated = await GoogleMessage.getAsThreadMember(messages[0].google_credential, messages[0].message_id)
  expect(updated.is_read).to.be.equal(true)
}

async function updateReadStatus() {
  const messages = await create()

  await GoogleMessage.updateReadStatus(messages[0].google_credential, messages[0].id, true)
  
  const updated = await GoogleMessage.getAsThreadMember(messages[0].google_credential, messages[0].message_id)
  expect(updated.is_read).to.be.equal(true)
}


describe('Google', () => {
  describe('Google Messages', () => {
    createContext()
    beforeEach(setup)

    it('should handle failure of get by id', getByIdFailed)
    it('should create some google-messages', create)
    it('should return google-message by messages_id', getByMessageId)
    it('should handle failure of google-contact get by messages_id', getByMessageIdFailed)
    it('should return google-message as a thread message', getAsThreadMember)
    it('should handle failure of get as a thread message', getAsThreadMemberFailed)
    it('should delete google-messages by messages_ids', deleteByMessageIds)
    it('should return number of messages of specific credential', getGCredentialMessagesNum)
    it('should handle failure of downloadAttachment', downloadAttachmentFailed)
    it('should get a message by remote id', getRemoteMessage)
    it('should update message is_read', updateIsRead)
    it('should update message read status', updateReadStatus)
  })
})