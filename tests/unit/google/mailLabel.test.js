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
  result = await createGoogleMessages(user, brand)

  credential = result.credential

  Context.set({ user, brand, credential })
}

async function createGoogleMailLabels() {
  const id = await GoogleMailLabel.upsertLabels(credential.id, mailLabels)

  // expect(id).to.be(uuid)
  console.log('----- createGoogleMailLabels', id)

  return id
}

async function getById() {
  const id = await createGoogleMailLabels()

  const labels = await GoogleMailLabel.get(id)

  console.log('getById', labels)

  return labels
}

async function getByCredential() {
  const labels = await GoogleMailLabel.getByCredential(credential.id)

  console.log('getByCredential', labels)

  return labels
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