const am = require('../utils/async_middleware.js')
const expect = require('../utils/validator.js').expect

const ShowingsCredential = require('../models/Showings/credential')



const createCredential = async function (req, res) {
  const body = req.body // { agent, username, password }

  expect(body.agent).to.be.a('string')
  expect(body.agent).to.be.uuid
  expect(body.username).to.be.a('string')
  expect(body.password).to.be.a('string')

  const showingsCredentialId = await ShowingsCredential.create(body)
  const showingsCredential = await ShowingsCredential.get(showingsCredentialId)

  return res.model(showingsCredential)
}

const getCredential = async function (req, res) {
  const showingsCredentialId = req.params.id

  expect(showingsCredentialId).to.be.uuid

  const showingsCredential = await ShowingsCredential.get(showingsCredentialId)

  return res.model(showingsCredential)
}

const getCredentialByAgent = async function (req, res) {
  const agent = req.params.agentId

  expect(agent).to.be.uuid

  const showingsCredential = await ShowingsCredential.getByAgent(agent)

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

  app.post('/showings/credential', auth, am(createCredential))

  app.get('/showings/credential/:id', auth, am(getCredential))
  app.get('/showings/credential/agent/:agentId', auth, am(getCredentialByAgent))

  app.put('/showings/credential/:id', auth, am(updateCredential))

  app.delete('/showings/credential/:id', auth, am(deleteCredential))
}

module.exports = router