const expect = require('../utils/validator.js').expect

const bodyParser = require('body-parser')

const fs = require('fs')
const format = require('util').format

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

    if (envelope.created_by !== req.user.id)
      return res.error(Error.Forbidden())

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
  expect(req.params.doc).not.to.be.NaN
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

      res.model({
        type: 'url',
        url_string: url
      })
    })
  })
}

function getEnvelopes(req, res) {
  req.access.deny('Client')

  expect(req.params.deal).to.be.uuid

  Envelope.getByDeal(req.params.deal, (err, envelopes) => {
    if (err)
      return res.error(err)

    res.collection(envelopes.filter(e => e.created_by === req.user.id))
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

const signedHtml = fs.readFileSync(__dirname + '/../html/envelope/signed.html').toString()

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

      res.write(format(signedHtml, config.app.name))
      res.end()
    })
  })
}

const router = function (app) {
  const b = app.auth.bearer

  app.post('/envelopes', b(createEnvelope))
  app.post('/envelopes/:id/hook', bodyParser.text({
    type: 'text/xml'
  }), updateStatus)
  app.get('/envelopes/:id.pdf', b(getDocuments))
  app.get('/envelopes/:id/:doc.pdf', b(getDocument))
  app.get('/envelopes/:id/sign', b(sign))
  app.patch('/envelopes/:id/status', b(patchStatus))
  app.get('/deals/:deal/envelopes', b(getEnvelopes))
  app.post('/envelopes/:id/resend', b(resend))
  app.get('/envelopes/:id/signed', signed)
}

module.exports = router
