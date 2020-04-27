const { expect }        = require('chai')
const { createContext } = require('../helper')

const Context  = require('../../../lib/models/Context')
const User     = require('../../../lib/models/User')
const BrandHelper         = require('../brand/helper')
const MicrosoftMailFolder = require('../../../lib/models/Microsoft/mail_folders')

const { createMicrosoftMessages } = require('./helper')

const mailFfolders = require('./data/mail_folders.json')

let user, brand



async function setup() {
  user  = await User.getByEmail('test@rechat.com')
  brand = await BrandHelper.create({ roles: { Admin: [user.id] } })

  Context.set({ user, brand })
}

async function createMicrosoftMailFolders() {
  const { credential } = await createMicrosoftMessages(user, brand)

  const folders = await MicrosoftMailFolder.upsertFolders(credential.id, mailFfolders)

  console.log('createMicrosoftMailFolders', folders)

  return folders
}

async function getByCredential() {
  const { credential } = await createMicrosoftMessages(user, brand)

  const folders = await MicrosoftMailFolder.getByCredential(credential.id)

  console.log('getByCredential', folders)

  return folders
}


describe('Microsoft', () => {
  describe('Microsoft Mail Folders', () => {
    createContext()
    beforeEach(setup)

    it('should create mail folders record', createMicrosoftMailFolders)
    it('should return mail folders by credential id', getByCredential)
  })
})