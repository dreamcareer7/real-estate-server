const { expect }        = require('chai')
const { createContext } = require('../helper')

const Context  = require('../../../lib/models/Context')
const User     = require('../../../lib/models/User/get')
const BrandHelper         = require('../brand/helper')
const MicrosoftMaiFolder = require('../../../lib/models/Microsoft/mail_folders')

const { createMicrosoftMessages } = require('./helper')

const maiFolders = require('./data/mail_folders.json')

let user, brand, credential



async function setup() {
  user   = await User.getByEmail('test@rechat.com')
  brand  = await BrandHelper.create({ roles: { Admin: [user.id] } })

  const result = await createMicrosoftMessages(user, brand)

  credential = result.credential

  Context.set({ user, brand, credential })
}

async function createMicrosoftMaiFolders() {
  const id = await MicrosoftMaiFolder.upsertFolders(credential.id, maiFolders)

  expect(id).to.be.uuid

  return id
}

async function getById() {
  const id = await createMicrosoftMaiFolders()

  const record = await MicrosoftMaiFolder.get(id)

  expect(record.id).to.be.equal(id)
  expect(record.credential).to.be.equal(credential.id)
  expect(record.folders.length).to.not.be.equal(0)

  return record
}

async function getByCredential() {
  const created = await getById()
  const record  = await MicrosoftMaiFolder.getByCredential(created.credential)

  expect(record.id).to.be.equal(created.id)
  expect(record.credential).to.be.equal(credential.id)
  expect(record.folders.length).to.not.be.equal(0)
}


describe('Microsoft', () => {
  describe('Microsoft Mail Folders', () => {
    createContext()
    beforeEach(setup)

    it('should create mail folders record', createMicrosoftMaiFolders)
    it('should return mail folders by id', getById)
    it('should return mail folders by credential id', getByCredential)
  })
})
