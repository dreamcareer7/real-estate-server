const am = require('../utils/async_middleware.js')
const expect = require('../utils/validator.js').expect
// const moment = require('moment-timezone')

// const Brand = require('../models/Brand')
// const User = require('../models/User')
// const Showings = require('../models/Showings/showings')
const ShowingsCredential = require('../models/Showings/credential')




const createCredential = async function (req, res) {
  const body = req.body // { agent, username, password }

  expect(body.agent).to.be.a('string')
  expect(body.agent).to.be.uuid
  expect(body.username).to.be.a('string')
  expect(body.password).to.be.a('string')

  const showingsCredentialId = await ShowingsCredential.create(body)
  console.log('create credential', showingsCredentialId)

  const showingsCredential = ShowingsCredential.get(showingsCredentialId)

  return res.model(showingsCredential)
}

const getCredential = async function (req, res) {
  const showingsCredentialId = req.params.id

  expect(showingsCredentialId).to.be.uuid

  const showingsCredential = ShowingsCredential.get(showingsCredentialId)

  return res.model(showingsCredential)
}

const getCredentialByAgent = async function (req, res) {
  const agent = req.params.agentId

  expect(agent).to.be.uuid

  ShowingsCredential.getByAgent(agent).nodeify(function (err, showingsCredential) {
    if (err)
      return res.error(err)

    return res.json({
      data: {
        type: 'showings_credential',
        id: showingsCredential.id,
        agent: showingsCredential.agent,
        username: showingsCredential.username,
        password: showingsCredential.password,
        last_crawled_at: showingsCredential.last_crawled_at
      },
      code: 'OK'
    })
  })
}

const updateCredential = async function (req, res) {
  const showingsCredentialId = req.params.id

  expect(showingsCredentialId).to.be.a('string')
  expect(showingsCredentialId).to.be.uuid
  expect(req.body.username).to.be.a('string')
  expect(req.body.password).to.be.a('string')

  await ShowingsCredential.update(showingsCredentialId, req.body)

  const showingsCredential = ShowingsCredential.get(showingsCredentialId)

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