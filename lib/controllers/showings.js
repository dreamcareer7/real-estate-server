const am = require('../utils/async_middleware.js')
const expect = require('../utils/validator.js').expect

const Brand = require('../models/Brand')
const ShowingsCredential = require('../models/Showings/credential')


function brandAccess(req, res, next) {
  const brand = getCurrentBrand()
  const user = req.user.id

  return Brand.limitAccess({ user, brand }).nodeify(err => {
    if (err) {
      return res.error(err)
    }

    next()
  })
}

function getCurrentBrand() {
  const brand = Brand.getCurrent()

  if (!brand || !brand.id)
    throw Error.BadRequest('Brand is not specified.')
  
  return brand.id
}

const createCredential = async function (req, res) {
  const body = req.body
  const brand = getCurrentBrand()

  expect(body.user).to.be.uuid
  expect(body.username).to.be.a('string')
  expect(body.password).to.be.a('string')
  expect(brand).to.be.uuid

  body.brand = brand

  const id = await ShowingsCredential.create(body)
  const showingsCredential = await ShowingsCredential.get(id)

  return res.model(showingsCredential)
}

const getCredential = async function (req, res) {
  const user = req.user.id
  const brand = getCurrentBrand()

  expect(user).to.be.uuid
  expect(brand).to.be.uuid

  console.log('--- user', user)
  console.log('--- brand', brand)

  const showingsCredential = await ShowingsCredential.getByUser(user, brand)

  return res.model(showingsCredential)
}

const getCredentialById = async function (req, res) {
  const id = req.params.id

  expect(id).to.be.uuid

  const showingsCredential = await ShowingsCredential.get(id)

  return res.model(showingsCredential)
}

const updateCredential = async function (req, res) {
  const id = req.params.id

  expect(id).to.be.a('string')
  expect(id).to.be.uuid
  expect(req.body.username).to.be.a('string')
  expect(req.body.password).to.be.a('string')

  await ShowingsCredential.updateCredential(id, req.body)

  const showingsCredential = await ShowingsCredential.get(id)

  return res.model(showingsCredential)
}

const deleteCredential = async function (req, res) {
  const id = req.params.id

  expect(id).to.be.a('string')
  expect(id).to.be.uuid

  await ShowingsCredential.delete(id)

  res.status(204)
  return res.end()
}


const router = function (app) {
  const auth = app.auth.bearer.middleware

  app.post('/showings/credentials', auth, brandAccess, am(createCredential))

  app.get('/showings/credentials', auth, brandAccess, am(getCredential))
  app.get('/showings/credentials/:id', auth, am(getCredentialById))

  app.put('/showings/credentials/:id', auth, am(updateCredential))

  app.delete('/showings/credentials/:id', auth, am(deleteCredential))
}

module.exports = router