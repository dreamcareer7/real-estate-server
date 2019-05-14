const am = require('../utils/async_middleware.js')
const expect = require('../utils/validator.js').expect

const Brand = require('../models/Brand')
const ShowingsCredential = require('../models/Showings/credential')


function getCurrentBrand() {
  const brand = Brand.getCurrent()

  if (!brand || !brand.id)
    throw Error.BadRequest('Brand is not specified.')
  
  return brand.id
}

const createCredential = async function (req, res) {
  const body = req.body // { user, brand, username, password }

  expect(body.user).to.be.uuid
  expect(body.brand).to.be.uuid
  expect(body.username).to.be.a('string')
  expect(body.password).to.be.a('string')

  const showingsCredentialId = await ShowingsCredential.create(body)
  const showingsCredential = await ShowingsCredential.get(showingsCredentialId)

  return res.model(showingsCredential)
}

const getCredential = async function (req, res) {
  const user = req.user.id
  const brand = getCurrentBrand()

  expect(user).to.be.uuid
  expect(brand).to.be.uuid

  const showingsCredential = await ShowingsCredential.getByUser(user, brand)

  return res.model(showingsCredential)
}

const getCredentialById = async function (req, res) {
  const showingsCredentialId = req.params.id

  expect(showingsCredentialId).to.be.uuid

  const showingsCredential = await ShowingsCredential.get(showingsCredentialId)

  return res.model(showingsCredential)
}

const updateCredential = async function (req, res) {
  const showingsCredentialId = req.params.id

  expect(showingsCredentialId).to.be.a('string')
  expect(showingsCredentialId).to.be.uuid
  expect(req.body.username).to.be.a('string')
  expect(req.body.password).to.be.a('string')

  await ShowingsCredential.updateCredential(showingsCredentialId, req.body)

  const showingsCredential = await ShowingsCredential.get(showingsCredentialId)

  return res.model(showingsCredential)
}

const deleteCredential = async function (req, res) {
  const showingsCredentialId = req.params.id

  expect(showingsCredentialId).to.be.a('string')
  expect(showingsCredentialId).to.be.uuid

  await ShowingsCredential.delete(showingsCredentialId)

  res.status(204)
  return res.end()
}


const router = function (app) {
  const auth = app.auth.bearer.middleware

  app.post('/showings/credentials', auth, am(createCredential))

  app.get('/showings/credentials', auth, am(getCredential))
  app.get('/showings/credentials/:id', auth, am(getCredentialById))

  app.put('/showings/credentials/:id', auth, am(updateCredential))

  app.delete('/showings/credentials/:id', auth, am(deleteCredential))
}

module.exports = router