const uuid       = require('uuid')
const { expect } = require('chai')
const { createContext } = require('../helper')

const Context          = require('../../../lib/models/Context')
const User             = require('../../../lib/models/User/get')
const BrandHelper      = require('../brand/helper')
const GoogleCredential = require('../../../lib/models/Google/credential')
const GoogleMessage    = require('../../../lib/models/Google/message')
const EmailThread      = require('../../../lib/models/Email/thread')

const { createGoogleMessages, createCampaign } = require('./helper')

let user, brand, gcredential


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

  gcredential = credential

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

async function getDistinctCredentialByThread() {
  const googleMessages = await create()

  const thread_keys = googleMessages.map(msg => msg.thread_key)
  const credentials = googleMessages.map(msg => msg.google_credential)

  const resutl = await GoogleMessage.getDistinctCredentialByThread(thread_keys)

  const status = resutl.every(entry => credentials.includes(entry))

  expect(status).to.equal(true)
}

async function getDistinctCredentialByMessage() {
  const googleMessages = await create()

  const ids = googleMessages.map(msg => msg.id)
  const credentials = googleMessages.map(msg => msg.google_credential)

  const resutl = await GoogleMessage.getDistinctCredentialByMessage(ids)

  const status = resutl.every(entry => credentials.includes(entry))

  expect(status).to.equal(true)
}

async function getByInternetMessageIds() {
  const googleMessages = await create()

  const ids = googleMessages.map(msg => msg.id)
  
  const messages = await GoogleMessage.getAll(ids)
  const internet_message_ids = messages.map(msg => msg.internet_message_id)
  
  const resutl = await GoogleMessage.getByInternetMessageIds(gcredential.id, internet_message_ids)

  const status = resutl.every(entry => internet_message_ids.includes(entry.internet_message_id))
  expect(resutl.length).to.equal(messages.length)
  expect(status).to.equal(true)
}

async function getByThreadKeys() {
  const googleMessages = await create()

  const ids = googleMessages.map(msg => msg.id)
  
  const messages = await GoogleMessage.getAll(ids)
  const thread_keys = messages.map(msg => msg.thread_key)
  
  const resutl = await GoogleMessage.getByThreadKeys(gcredential.id, thread_keys)

  const status = resutl.every(entry => ids.includes(entry))
  expect(resutl.length).to.equal(messages.length)
  expect(status).to.equal(true)
}

async function filterMessageIds() {
  const googleMessages = await create()

  const ids = googleMessages.map(msg => msg.id)
  ids.push(uuid.v4()) // pushing non exist message id
  
  const messages = await GoogleMessage.getAll(ids)  
  const resutl   = await GoogleMessage.filterMessageIds(gcredential.id, ids)

  const status = resutl.every(entry => ids.includes(entry))
  expect(resutl.length).to.equal(messages.length)
  expect(status).to.equal(true)
}

async function getGCredentialMessagesNum() {
  const googleMessages = await create()

  const result = await GoogleMessage.getGCredentialMessagesNum(googleMessages[0]['google_credential'])

  expect(result[0]['count']).to.be.equal(googleMessages.length)
}

async function deleteMany() {
  const messages   = await create()
  const credential = await GoogleCredential.get(messages[0].google_credential)
  const resutl     = await EmailThread.filter(credential.user, credential.brand, {})

  const ids = []

  for (const message of messages) {
    ids.push(message.id)
  }

  for (const message of messages) {
    const googleMessage = await GoogleMessage.get(message.id)

    expect(googleMessage.type).to.be.equal('google_message')
    expect(googleMessage.deleted_at).to.be.equal(null)
    expect(resutl.ids.includes(googleMessage.thread_key)).to.be.equal(true)
  }

  await GoogleMessage.deleteMany(credential.id, ids)
  const resutlNew = await EmailThread.filter(credential.user, credential.brand, {})

  for (const message of messages) {
    const googleMessage = await GoogleMessage.get(message.id)

    expect(googleMessage.type).to.be.equal('google_message')
    expect(googleMessage.google_credential).to.be.equal(message.google_credential)
    expect(googleMessage.deleted_at).not.to.be.equal(null)
    expect(resutlNew.ids.includes(googleMessage.thread_key)).to.be.equal(false)
  }
}

async function deleteByCredential() {
  const messages   = await create()
  const credential = await GoogleCredential.get(messages[0].google_credential)
  const resutl     = await EmailThread.filter(credential.user, credential.brand, {})

  for (const message of messages) {
    const googleMessage = await GoogleMessage.get(message.id)
    
    expect(googleMessage.type).to.be.equal('google_message')
    expect(googleMessage.deleted_at).to.be.equal(null)
    expect(resutl.ids.includes(googleMessage.thread_key)).to.be.equal(true)
  }

  await GoogleMessage.deleteByCredential(messages[0].google_credential)
  const resutlNew = await EmailThread.filter(credential.user, credential.brand, {})

  for (const message of messages) {
    const googleMessage = await GoogleMessage.get(message.id)

    expect(googleMessage.type).to.be.equal('google_message')
    expect(googleMessage.google_credential).to.be.equal(message.google_credential)
    expect(googleMessage.deleted_at).not.to.be.equal(null)
    expect(resutlNew.ids.includes(googleMessage.thread_key)).to.be.equal(false)
  }
}

async function deleteByMessageIds() {
  const messages   = await create()
  const credential = await GoogleCredential.get(messages[0].google_credential)
  const resutl     = await EmailThread.filter(credential.user, credential.brand, {})

  for (const message of messages) {
    const googleMessage = await GoogleMessage.getByMessageId(message.message_id, message.google_credential)

    expect(googleMessage.type).to.be.equal('google_message')
    expect(googleMessage.deleted_at).to.be.equal(null)
    expect(resutl.ids.includes(googleMessage.thread_key)).to.be.equal(true)
  }

  for (const message of messages) {
    await GoogleMessage.deleteByMessageIds(message.google_credential, [message.message_id])
  }

  const resutlNew = await EmailThread.filter(credential.user, credential.brand, {})

  for (const message of messages) {
    const googleMessage = await GoogleMessage.getByMessageId(message.message_id, message.google_credential)

    expect(googleMessage.type).to.be.equal('google_message')
    expect(googleMessage.google_credential).to.be.equal(message.google_credential)
    expect(googleMessage.deleted_at).not.to.be.equal(null)
    expect(resutlNew.ids.includes(googleMessage.thread_key)).to.be.equal(false)
  }
}

async function deleteByThreadKeys() {
  const messages   = await create()
  const threadKeys = messages.map(msg => msg.thread_key)
  const credential = await GoogleCredential.get(messages[0].google_credential)

  await GoogleMessage.deleteByThreadKeys(credential.id, threadKeys)

  const resutlNew = await EmailThread.filter(credential.user, credential.brand, {})

  for (const message of messages) {
    const googleMessage = await GoogleMessage.get(message.id)

    expect(googleMessage.type).to.be.equal('google_message')
    expect(googleMessage.google_credential).to.be.equal(message.google_credential)
    expect(googleMessage.deleted_at).not.to.be.equal(null)
    expect(resutlNew.ids.includes(googleMessage.thread_key)).to.be.equal(false)
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
  expect(gmailMessage.type).to.be.equal('google_message')
  expect(gmailMessage.google_credential).to.be.equal(messages[0].google_credential)
  expect(gmailMessage.has_attachments).to.be.equal(true)

  return gmailMessage
}

async function updateIsRead() {
  const messages = await create()

  const message = await GoogleMessage.get(messages[0].id)
  expect(message.is_read).to.be.equal(false)

  await GoogleMessage.updateIsRead([messages[0].id], true, messages[0].google_credential)
  
  const updated = await GoogleMessage.get(messages[0].id)
  expect(updated.is_read).to.be.equal(true)
}

async function setCampaign() {
  const campaign = await createCampaign(user, brand)
  const messages = await create()

  const message = await GoogleMessage.get(messages[0].id)
  expect(message.is_read).to.be.equal(false)

  await GoogleMessage.setCampaign(messages[0].id, campaign)
  
  const updated = await GoogleMessage.get(messages[0].id)
  expect(updated.campaign).to.be.equal(campaign)
}

async function updateReadStatus() {
  const messages = await create()

  await GoogleMessage.updateReadStatus(messages[0].google_credential, [messages[0].id], true)
  
  const updated = await GoogleMessage.get(messages[0].id)
  expect(updated.is_read).to.be.equal(true)
}

async function watchMailBox() {
  const messages = await create()
  const result   = await GoogleMessage.watchMailBox(messages[0].google_credential)
  
  expect(result.historyId).to.be.equal('24753')
  expect(result.expiration).to.be.equal('1579959900549')
}

async function stopWatchMailBox() {
  const messages = await create()
  const result   = await GoogleMessage.stopWatchMailBox(messages[0].google_credential)
  
  expect(result).to.be.equal(true)
}


describe('Google', () => {
  describe('Google Messages', () => {
    createContext()
    beforeEach(setup)

    it('should handle failure of get by id', getByIdFailed)
    it('should create some google-messages', create)
    it('should return google-message by messages_id', getByMessageId)
    it('should handle failure of google-contact get by messages_id', getByMessageIdFailed)
    it('should return a list of unique credential ids based on thread_keys', getDistinctCredentialByThread)
    it('should return a list of unique credential ids based on ids', getDistinctCredentialByMessage)
    it('should return a list of unique messages ids based on internet_message_ids', getByInternetMessageIds)
    it('should return a list of unique messages ids based on thread_keys', getByThreadKeys)
    it('should filter a list of unique messages ids based on ids', filterMessageIds)
    it('should delete google-messages by ids', deleteMany)
    it('should delete google-messages by credential', deleteByCredential)
    it('should delete google-messages by messages_ids', deleteByMessageIds)
    it('should delete google-messages by thread keys', deleteByThreadKeys)
    it('should return number of messages of specific credential', getGCredentialMessagesNum)
    it('should handle failure of downloadAttachment', downloadAttachmentFailed)
    it('should get a message by remote id', getRemoteMessage)
    it('should update message is_read', updateIsRead)
    it('should update message campaign', setCampaign)
    it('should update message read status', updateReadStatus)
    it('should handle watch mail-box', watchMailBox)
    it('should handle stop watch mail-box', stopWatchMailBox)
  })
})