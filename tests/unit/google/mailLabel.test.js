const { expect }        = require('chai')
const { createContext } = require('../helper')

const Context  = require('../../../lib/models/Context')
const User     = require('../../../lib/models/User')
const BrandHelper         = require('../brand/helper')
const GoogleMailLabel = require('../../../lib/models/Google/mail_labels')

const { createGoogleMessages } = require('./helper')

const mailLabels = require('./data/mail_label.json')

let user, brand, credential



async function setup() {
  user   = await User.getByEmail('test@rechat.com')
  brand  = await BrandHelper.create({ roles: { Admin: [user.id] } })

  const result = await createGoogleMessages(user, brand)

  credential = result.credential

  Context.set({ user, brand, credential })
}

async function createGoogleMailLabels() {
  const id = await GoogleMailLabel.upsertLabels(credential.id, mailLabels)

  expect(id).to.be.uuid

  return id
}

async function getById() {
  const id = await createGoogleMailLabels()

  const record = await GoogleMailLabel.get(id)

  expect(record.id).to.be.equal(id)
  expect(record.credential).to.be.equal(credential.id)
  expect(record.labels.length).to.not.be.equal(0)

  return record
}

async function getByCredential() {
  const created = await getById()
  const record  = await GoogleMailLabel.getByCredential(created.credential)

  expect(record.id).to.be.equal(created.id)
  expect(record.credential).to.be.equal(credential.id)
  expect(record.labels.length).to.not.be.equal(0)
}


describe('Google', () => {
  describe('Google Mail Labels', () => {
    createContext()
    beforeEach(setup)

    it('should create mail labels record', createGoogleMailLabels)
    it('should return mail labels by id', getById)
    it('should return mail labels by credential id', getByCredential)
  })
})