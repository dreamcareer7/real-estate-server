const uuid = require('uuid')
const { expect }        = require('chai')
const { createContext } = require('../helper')

const Context             = require('../../../lib/models/Context')
const User                = require('../../../lib/models/User/get')
const BrandHelper         = require('../brand/helper')
const MicrosoftMessage    = require('../../../lib/models/Microsoft/message')
const MicrosoftCredential = require('../../../lib/models/Microsoft/credential')
const EmailThread         = require('../../../lib/models/Email/thread')

const { createMicrosoftMessages, createCampaign } = require('./helper')

let user, brand, mcredential


async function setup() {
  user  = await User.getByEmail('test@rechat.com')
  brand = await BrandHelper.create({ roles: { Admin: [user.id] } })

  Context.set({ user, brand })
}

async function create() {
  const { createdMessages, credential } = await createMicrosoftMessages(user, brand)

  mcredential = credential

  for (const createdMicrosoftMessage of createdMessages) {
    expect(createdMicrosoftMessage.microsoft_credential).to.be.equal(credential.id)
    
    const microsoftMessage = await MicrosoftMessage.getByMessageId(createdMicrosoftMessage.message_id, createdMicrosoftMessage.microsoft_credential)
    console.log(microsoftMessage)
    expect(microsoftMessage.from).not.to.be.equal(null)
    expect(microsoftMessage.to.length).not.to.be.equal(0)
    expect(microsoftMessage.type).to.be.equal('microsoft_message')
    expect(microsoftMessage.recipients.length).not.to.be.equal(0)
  }

  return createdMessages
}

async function getByMessageId() {
  const microsoftMessages = await create()

  for (const mMessage of microsoftMessages) {

    const microsoftMessage = await MicrosoftMessage.getByMessageId(mMessage.message_id, mMessage.microsoft_credential)

    expect(microsoftMessage.type).to.be.equal('microsoft_message')
    expect(microsoftMessage.microsoft_credential).to.be.equal(mMessage.microsoft_credential)
    expect(microsoftMessage.recipients.length).not.to.be.equal(0)
    expect(microsoftMessage.message_id).to.be.equal(mMessage.message_id)
  }
}

async function getByMessageIdFailed() {
  const bad_id = user.id

  try {
    await MicrosoftMessage.getByMessageId(bad_id, bad_id)
  } catch(ex) {
    expect(ex.message).to.be.equal(`MicrosoftMessage ${bad_id} in credential ${bad_id} not found.`)
  }
}

async function getDistinctCredentialByThread() {
  const microsoftMessages = await create()

  const thread_keys = microsoftMessages.map(msg => msg.thread_key)
  const credentials = microsoftMessages.map(msg => msg.microsoft_credential)

  const resutl = await MicrosoftMessage.getDistinctCredentialByThread(thread_keys)

  const status = resutl.every(entry => credentials.includes(entry))

  expect(status).to.equal(true)
}

async function getDistinctCredentialByMessage() {
  const microsoftMessages = await create()

  const ids = microsoftMessages.map(msg => msg.id)
  const credentials = microsoftMessages.map(msg => msg.microsoft_credential)

  const resutl = await MicrosoftMessage.getDistinctCredentialByMessage(ids)

  const status = resutl.every(entry => credentials.includes(entry))

  expect(status).to.equal(true)
}

async function getByInternetMessageIds() {
  const microsoftMessages = await create()

  const ids = microsoftMessages.map(msg => msg.id)
  
  const messages = await MicrosoftMessage.getAll(ids)
  const internet_message_ids = messages.map(msg => msg.internet_message_id)
  
  const resutl = await MicrosoftMessage.getByInternetMessageIds(mcredential.id, internet_message_ids)

  const status = resutl.every(entry => internet_message_ids.includes(entry.internet_message_id))
  expect(resutl.length).to.equal(messages.length)
  expect(status).to.equal(true)
}

async function getByThreadKeys() {
  const microsoftMessages = await create()

  const ids = microsoftMessages.map(msg => msg.id)
  
  const messages = await MicrosoftMessage.getAll(ids)
  const thread_keys = messages.map(msg => msg.thread_key)
  
  const resutl = await MicrosoftMessage.getByThreadKeys(mcredential.id, thread_keys)

  const status = resutl.every(entry => ids.includes(entry))
  expect(resutl.length).to.equal(messages.length)
  expect(status).to.equal(true)
}

async function filterMessageIds() {
  const microsoftMessages = await create()

  const ids = microsoftMessages.map(msg => msg.id)
  ids.push(uuid.v4()) // pushing non exist message id
  
  const messages = await MicrosoftMessage.getAll(ids)  
  const resutl   = await MicrosoftMessage.filterMessageIds(mcredential.id, ids)

  const status = resutl.every(entry => ids.includes(entry))
  expect(resutl.length).to.equal(messages.length)
  expect(status).to.equal(true)
}

async function getMCredentialMessagesNum() {
  const microsoftMessages = await create()

  const result = await MicrosoftMessage.getMCredentialMessagesNum(microsoftMessages[0]['microsoft_credential'])

  expect(result[0]['count']).to.be.equal(microsoftMessages.length)
}

async function deleteMany() {
  const messages   = await create()
  const credential = await MicrosoftCredential.get(messages[0].microsoft_credential)
  const resutl     = await EmailThread.filter(credential.user, credential.brand, {})

  const ids = []

  for (const message of messages) {
    ids.push(message.id)
  }

  for (const message of messages) {
    const microsoftMessage = await MicrosoftMessage.get(message.id)

    expect(microsoftMessage.type).to.be.equal('microsoft_message')
    expect(microsoftMessage.deleted_at).to.be.equal(null)
    expect(resutl.ids.includes(microsoftMessage.thread_key)).to.be.equal(true)
  }

  await MicrosoftMessage.deleteMany(credential.id, ids)
  const resutlNew = await EmailThread.filter(credential.user, credential.brand, {})

  for (const message of messages) {
    const microsoftMessage = await MicrosoftMessage.get(message.id)

    expect(microsoftMessage.type).to.be.equal('microsoft_message')
    expect(microsoftMessage.microsoft_credential).to.be.equal(message.microsoft_credential)
    expect(microsoftMessage.deleted_at).not.to.be.equal(null)
    expect(resutlNew.ids.includes(microsoftMessage.thread_key)).to.be.equal(false)
  }
}

async function deleteByCredential() {
  const messages   = await create()
  const credential = await MicrosoftCredential.get(messages[0].microsoft_credential)
  const resutl     = await EmailThread.filter(credential.user, credential.brand, {})

  for (const message of messages) {
    const microsoftMessage = await MicrosoftMessage.get(message.id)

    expect(microsoftMessage.type).to.be.equal('microsoft_message')
    expect(microsoftMessage.deleted_at).to.be.equal(null)
    expect(resutl.ids.includes(microsoftMessage.thread_key)).to.be.equal(true)
  }

  await MicrosoftMessage.deleteByCredential(credential.id)
  const resutlNew = await EmailThread.filter(credential.user, credential.brand, {})

  for (const message of messages) {
    const microsoftMessage = await MicrosoftMessage.get(message.id)

    expect(microsoftMessage.type).to.be.equal('microsoft_message')
    expect(microsoftMessage.microsoft_credential).to.be.equal(message.microsoft_credential)
    expect(microsoftMessage.deleted_at).not.to.be.equal(null)
    expect(resutlNew.ids.includes(microsoftMessage.thread_key)).to.be.equal(false)
  }
}

async function deleteByInternetMessageIds() {
  const messages   = await create()
  const credential = await MicrosoftCredential.get(messages[0].microsoft_credential)
  const resutl     = await EmailThread.filter(credential.user, credential.brand, {})

  for (const message of messages) {
    const microsoftMessage = await MicrosoftMessage.get(message.id)

    expect(microsoftMessage.type).to.be.equal('microsoft_message')
    expect(microsoftMessage.deleted_at).to.be.equal(null)
    expect(resutl.ids.includes(microsoftMessage.thread_key)).to.be.equal(true)
  }

  for (const message of messages) {
    await MicrosoftMessage.deleteByInternetMessageIds(message.microsoft_credential, [message.internet_message_id])
  }

  const resutlNew = await EmailThread.filter(credential.user, credential.brand, {})

  for (const message of messages) {
    const microsoftMessage = await MicrosoftMessage.get(message.id)

    expect(microsoftMessage.type).to.be.equal('microsoft_message')
    expect(microsoftMessage.microsoft_credential).to.be.equal(message.microsoft_credential)
    expect(microsoftMessage.deleted_at).not.to.be.equal(null)
    expect(resutlNew.ids.includes(microsoftMessage.thread_key)).to.be.equal(false)
  }
}

async function deleteByRemoteMessageIds() {
  const messages   = await create()
  const credential = await MicrosoftCredential.get(messages[0].microsoft_credential)
  const resutl     = await EmailThread.filter(credential.user, credential.brand, {})

  for (const message of messages) {
    const microsoftMessage = await MicrosoftMessage.get(message.id)

    expect(microsoftMessage.type).to.be.equal('microsoft_message')
    expect(microsoftMessage.deleted_at).to.be.equal(null)
    expect(resutl.ids.includes(microsoftMessage.thread_key)).to.be.equal(true)
  }

  for (const message of messages) {
    await MicrosoftMessage.deleteByRemoteMessageIds(message.microsoft_credential, [message.message_id])
  }

  const resutlNew = await EmailThread.filter(credential.user, credential.brand, {})

  for (const message of messages) {
    const microsoftMessage = await MicrosoftMessage.get(message.id)

    expect(microsoftMessage.type).to.be.equal('microsoft_message')
    expect(microsoftMessage.microsoft_credential).to.be.equal(message.microsoft_credential)
    expect(microsoftMessage.deleted_at).not.to.be.equal(null)
    expect(resutlNew.ids.includes(microsoftMessage.thread_key)).to.be.equal(false)
  }
}

async function deleteByThreadKeys() {
  const messages   = await create()
  const threadKeys = messages.map(msg => msg.thread_key)
  const credential = await MicrosoftCredential.get(messages[0].microsoft_credential)

  await MicrosoftMessage.deleteByThreadKeys(credential.id, threadKeys)

  const resutlNew = await EmailThread.filter(credential.user, credential.brand, {})

  for (const message of messages) {
    const microsoftMessage = await MicrosoftMessage.get(message.id)

    expect(microsoftMessage.type).to.be.equal('microsoft_message')
    expect(microsoftMessage.microsoft_credential).to.be.equal(message.microsoft_credential)
    expect(microsoftMessage.deleted_at).not.to.be.equal(null)
    expect(resutlNew.ids.includes(microsoftMessage.thread_key)).to.be.equal(false)
  }
}

async function downloadAttachmentFailed() {
  const microsoftMessages = await create()
  const microsoftMessage_min = microsoftMessages[0]

  const microsoftMessage = await MicrosoftMessage.getByMessageId(microsoftMessage_min.message_id, microsoftMessage_min.microsoft_credential)

  const bad_id = uuid.v4()

  try {
    await MicrosoftMessage.downloadAttachment(bad_id, bad_id, bad_id)
  } catch(ex) {
    expect(ex.message).to.be.equal(`MicrosoftMessage ${bad_id} in credential ${bad_id} not found.`)
  }

  try {
    await MicrosoftMessage.downloadAttachment(microsoftMessage.microsoft_credential, bad_id, bad_id)
  } catch(ex) {
    expect(ex.message).to.be.equal(`MicrosoftMessage ${bad_id} in credential ${microsoftMessage.microsoft_credential} not found.`)
  }
}

async function updateIsRead() {
  const messages   = await create()
  const credential = await MicrosoftCredential.get(messages[0].microsoft_credential)

  const message = await MicrosoftMessage.get(messages[0].id)
  expect(message.is_read).to.be.equal(false)

  await MicrosoftMessage.updateIsRead([messages[0].id], true, credential.id)

  const updated = await MicrosoftMessage.get(messages[0].id)
  expect(updated.is_read).to.be.equal(true)
}

async function setCampaigns() {
  const campaign = await createCampaign(user, brand)
  const messages = await create()

  const records = [{
    campaign,
    microsoft_credential: mcredential.id,
    message_id: messages[0].message_id
  }]

  await MicrosoftMessage.setCampaigns(records)
  
  const updated = await MicrosoftMessage.get(messages[0].id)
  expect(updated.campaign).to.be.equal(campaign)
}

async function updateReadStatus() {
  const messages   = await create()
  const credential = await MicrosoftCredential.get(messages[0].microsoft_credential)

  await MicrosoftMessage.updateReadStatus(credential, [messages[0].id], true)

  const updated = await MicrosoftMessage.get(messages[0].id)
  expect(updated.is_read).to.be.equal(true)
}


describe('Microsoft', () => {
  describe('Microsoft Messages', () => {
    createContext()
    beforeEach(setup)

    it('should create some microsoft-messages', create)
    it('should return microsoft-message by messages_id', getByMessageId)
    it('should handle failure of microsoft-contact get by messages_id', getByMessageIdFailed)
    it('should return a list of unique credential ids based on thread_keys', getDistinctCredentialByThread)
    it('should return a list of unique credential ids based on message ids', getDistinctCredentialByMessage)
    it('should return a list of unique messages ids based on internet_message_ids', getByInternetMessageIds)
    it('should return a list of unique messages ids based on thread_keys', getByThreadKeys)
    it('should filter a list of unique messages ids based on ids', filterMessageIds)
    it('should return number of messages of specific credential', getMCredentialMessagesNum)
    it('should delete microsoft-messages by ids', deleteMany)
    it('should delete microsoft-messages by credential', deleteByCredential)
    it('should delete microsoft-messages by internet_messages_ids', deleteByInternetMessageIds)
    it('should delete microsoft-messages by remote_message_id', deleteByRemoteMessageIds)
    it('should delete microsoft-messages by thread keys', deleteByThreadKeys)
    it('should handle failure of downloadAttachment', downloadAttachmentFailed)
    it('should update message is_read', updateIsRead)
    it('should update message campaign', setCampaigns)
    it('should update message read status', updateReadStatus)
  })
})