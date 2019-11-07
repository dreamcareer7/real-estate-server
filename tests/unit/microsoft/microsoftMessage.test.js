const uuid = require('uuid')
const { expect }        = require('chai')
const { createContext } = require('../helper')

const Context             = require('../../../lib/models/Context')
const User                = require('../../../lib/models/User')
const BrandHelper         = require('../brand/helper')
const MicrosoftMessage    = require('../../../lib/models/Microsoft/message')

const { createMicrosoftMessages } = require('./helper')

let user, brand


async function setup() {
  user  = await User.getByEmail('test@rechat.com')
  brand = await BrandHelper.create({ roles: { Admin: [user.id] } })

  Context.set({ user, brand })
}

async function create() {
  const { createdMessages, credential } = await createMicrosoftMessages(user, brand)

  for (const createdMicrosoftMessage of createdMessages) {
    expect(createdMicrosoftMessage.microsoft_credential).to.be.equal(credential.id)
    
    const microsoftMessage = await MicrosoftMessage.get(createdMicrosoftMessage.message_id, createdMicrosoftMessage.microsoft_credential)

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

async function deleteByInternetMessageIds() {
  const microsoftMessages = await create()

  for (const mMessage of microsoftMessages) {
    await MicrosoftMessage.deleteByInternetMessageIds(mMessage.microsoft_credential, [mMessage.internet_message_id])
  }

  for (const mMessage of microsoftMessages) {
    const microsoftMessage = await MicrosoftMessage.get(mMessage.message_id, mMessage.microsoft_credential)

    expect(microsoftMessage.type).to.be.equal('microsoft_message')
    expect(microsoftMessage.microsoft_credential).to.be.equal(mMessage.microsoft_credential)
    expect(microsoftMessage.deleted_at).not.to.be.equal(null)
  }
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
    it('should delete microsoft-messages by internet_messages_ids', deleteByInternetMessageIds)

    it('should handle failure of downloadAttachment', downloadAttachmentFailed)
  })
})