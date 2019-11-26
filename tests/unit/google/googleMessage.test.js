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
    expect(ex.message).to.be.equal(`Google-Credential ${bad_id} not found`)
  }

  try {
    await GoogleMessage.downloadAttachment(googleMessage.google_credential, bad_id, bad_id)
  } catch(ex) {
    expect(ex.message).to.be.equal('Related Google-Message Not Found!')
  }

  try {
    await GoogleMessage.downloadAttachment(googleMessage.google_credential, googleMessage.message_id, bad_id)
  } catch(ex) {
    expect(ex.message).to.be.equal('Google-Message-Attachment Not Found!')
  }
}


describe('Google', () => {
  describe('Google Messages', () => {
    createContext()
    beforeEach(setup)

    it('should create some google-messages', create)
    it('should return google-message by messages_id', getByMessageId)
    it('should handle failure of google-contact get by messages_id', getByMessageIdFailed)
    it('should return number of messages of specific credential', getGCredentialMessagesNum)
    it('should delete google-messages by messages_ids', deleteByMessageIds)

    it('should handle failure of downloadAttachment', downloadAttachmentFailed)
  })
})