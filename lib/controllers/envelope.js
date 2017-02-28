const expect = require('../utils/validator.js').expect

const bodyParser = require('body-parser')

const fs = require('fs')
const format = require('util').format
const url = require('url')

const config = require('../config.js')

function createEnvelope (req, res) {
  req.access.deny('Client')

  const envelope = req.body
  envelope.created_by = req.user.id
  envelope.document_access_token = req.token_info.access_token

  Envelope.create(req.body, function (err, envelope) {
    if (err) {
      if (err.http === 401) {
        res.statusCode = 428
        res.end()
        return
      }

      return res.error(err)
    }

    res.model(envelope)
  })
}

function updateStatus(req, res) {
  expect(req.params.id).to.be.uuid

  expect(req.query.token).to.be.uuid

  Envelope.get(req.params.id, (err, envelope) => {
    if (err)
      return res.error(err)

    if (envelope.webhook_token !== req.query.token)
      return res.error(Error.Forbidden())

    Envelope.updateStatus(req.params.id, req.body, err => {
      if (err)
        return res.error(err)

      res.end()
    })
  })
}

function _getDocuments(req, res, document) {
  req.access.deny('Client')

  expect(req.params.id).to.be.uuid

  Envelope.get(req.params.id, (err, envelope) => {
    if (err)
      return res.error(err)

    Envelope.getDocuments(req.params.id, document, (err, pdf) => {
      if (err)
        return res.error(err)

      res.header('Content-Type', 'application/pdf')
      res.header('Content-Length', pdf.length)

      res.end(pdf)
    })
  })
}

function getDocuments(req, res) {
  _getDocuments(req, res, 'combined')
}


function getDocument(req, res) {
  _getDocuments(req, res, req.params.doc)
}

function sign(req, res) {
  req.access.deny('Client')

  expect(req.params.id).to.be.uuid

  Envelope.get(req.params.id, (err, envelope) => {
    if (err)
      return res.error(err)

    if (envelope.created_by !== req.user.id)
      return res.error(Error.Forbidden())

    Envelope.getSignUrl({
      envelope_id: req.params.id,
      user: req.user
    }, (err, url) => {
      if (err)
        return res.error(err)

      res.redirect(url)
    })
  })
}

function getEnvelopes(req, res) {
  req.access.deny('Client')

  expect(req.params.deal).to.be.uuid

  Envelope.getByDeal(req.params.deal, (err, envelopes) => {
    if (err)
      return res.error(err)

    res.collection(envelopes)
  })
}

function getEnvelope(req, res) {
  req.access.deny('Client')

  expect(req.params.id).to.be.uuid

  Envelope.get(req.params.id, (err, envelope) => {
    if (err)
      return res.error(err)

    if (envelope.created_by !== req.user.id)
      return res.error(Error.Forbidden())

    res.model(envelope)
  })
}

function patchStatus(req, res) {
  const envelope_id = req.params.id
  const status = req.body.status

  expect(envelope_id).to.be.uuid
  expect(status).to.be.a('string')

  if(status !== 'Voided')
    return res.error(Error.Validation('You can only void an envelope'))

  Envelope.void(req.params.id, (err, envelope) => {
    if(err)
      return res.error(err)

    res.model(envelope)
  })
}

function resend(req, res) {
  const envelope_id = req.params.id

  expect(envelope_id).to.be.uuid

  Envelope.get(envelope_id, (err, envelope) => {
    if (err)
      return res.error(err)

    if (envelope.created_by !== req.user.id)
      return res.error(Error.Forbidden())


    Envelope.resend(req.params.id, err => {
      if(err)
        return res.error(err)

      res.model(envelope)
    })
  })
}

const closeWebviewHtml = fs.readFileSync(__dirname + '/../html/envelope/close_webview.html').toString()
const closeWebview = (res) => {
  res.header('Content-Type', 'text/html')
  res.write(closeWebviewHtml)
  res.end()
}
function signed(req, res) {
  expect(req.params.id).to.be.uuid

  expect(req.query.token).to.be.uuid

  Envelope.get(req.params.id, (err, envelope) => {
    if (err)
      return res.error(err)

    if (envelope.webhook_token !== req.query.token)
      return res.error(Error.Forbidden())

    Envelope.update(req.params.id, err => {
      if (err)
        return res.error(err)

      closeWebview(res)
    })
  })
}

const authenticate = (req, res) => {
  const base = url.parse(config.docusign.baseurl)
  base.pathname = '/oauth/auth'
  base.query = {
    response_type: 'code',
    scope: 'signature',
    client_id: config.docusign.integrator_key,
    state: JSON.stringify({
      signature: Crypto.sign(req.user.id).toString('base64'),
      user_id: req.user.id,
    }),
    redirect_uri: Url.api({
      uri: '/docusign/auth/done',
    })
  }

  res.redirect(url.format(base))
}

const openAppHtml = fs.readFileSync(__dirname + '/../html/envelope/open_app.html').toString()
const openApp = (res, uri) => {
  res.header('Content-Type', 'text/html')
  res.write(format(openAppHtml, config.app.name, uri))
  res.end()
}

const authDone = (req, res) => {
  const code = req.query.code
  const state = JSON.parse(req.query.state)

  if (!state.signature || !state.user_id || !Crypto.verify(state.user_id, new Buffer(state.signature, 'base64')))
    return res.error(Error.Unauthorized())

  Envelope.saveUserInfo(state.user_id, code, err => {
    if (err)
      return res.error(err)

    openApp(res, 'docusign-authenticated')
  })
}

const access = (req, res, next) => {
  const envelope_id = req.params.id

  expect(envelope_id).to.be.uuid

  Envelope.get(envelope_id, (err, envelope) => {
    if (err)
      return res.error(err)

    Deal.limitAccess({
      user: req.user,
      deal_id: envelope.deal
    }, err => {
      if (err)
        res.error(err)

      next()
    })
  })
}

const router = function (app) {
  const auth = app.auth.bearer.middleware

  app.post('/envelopes', auth, createEnvelope)
  app.get('/envelopes/:id', auth, access, getEnvelope)
  app.post('/envelopes/:id/hook', bodyParser.text({
    type: 'text/xml'
  }), updateStatus)
  app.get('/envelopes/:id.pdf', auth, access, getDocuments)
  app.get('/envelopes/:id/:doc.pdf', auth, access, getDocument)
  app.get('/envelopes/:id/sign', auth, access, sign)
  app.patch('/envelopes/:id/status', auth, access, patchStatus)
  app.get('/deals/:deal/envelopes', auth, getEnvelopes)
  app.post('/envelopes/:id/resend', auth, access, resend)
  app.get('/envelopes/:id/signed', access, signed)
  app.get('/users/self/docusign/auth', auth, authenticate)
  app.get('/docusign/auth/done', authDone)
}

module.exports = router
