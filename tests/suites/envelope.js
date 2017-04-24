const {envelope, auth} = require('./data/envelope.js')
const envelope_response = require('./expected_objects/envelope.js')

const login = require('./utils/docusign.js')


registerSuite('submission', ['create'])

const create412 = cb => {
  envelope.documents[0].revision = results.submission.create.data.last_revision

  envelope.deal = results.deal.create.data.id

  envelope.recipients[0].firstName = 'Emil'
  envelope.recipients[0].lastName = 'Sedgh'
  envelope.recipients[0].email = 'emil@rechat.com'

  // Add myself as a recipient so later I can sign this as well
  envelope.recipients[1].user = results.authorize.token.data.id

  return frisby.create('create an envelope before authenticating with docusign and expect a 412')
    .post('/envelopes', envelope)
    .after(cb)
    .expectStatus(412)
    .expectJSON({
      http: 412,
      code: 'DocusignAuthenticationRequired'
    })
}

let callback_url

const authenticate = cb => {
  return frisby.create('Authenticate to docusign')
    .get('/users/self/docusign/auth')
    .after((err, res) => {
      if (err)
        return cb(err)

      const url = 'https://' + res.req._headers.host + res.req.path

      try {
        callback_url = login({
          username: auth.username,
          password: auth.password,
          url
        })
      } catch (err) {
        console.log('Cannot authenticate using BrowserStack', err)
        return cb(err, res)
      }

      cb(err, res)
    })
    .expectStatus(200)
}

const saveToken = cb => {
  const path = require('url').parse(callback_url).path

  return frisby.create('Save docusign token')
    .get(path)
    .after(cb)
    .expectStatus(200)
}

const create = cb => {
  return frisby.create('create an envelope')
    .post('/envelopes', envelope)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK'
    })
    .expectJSONTypes({
      code: String,
      data: envelope_response
    })
}

const get = cb => {
  return frisby.create('get an envelope')
    .get(`/envelopes/${results.envelope.create.data.id}`)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
//       data: results.envelope.create.data  Elements in envelope.recipients are showing up in random order which messes the tests
    })
    .expectJSONTypes({
      data: envelope_response,
      code: String
    })
}

const getDealEnvelopes = cb => {
  return frisby.create('get envelopes of a deal')
    .get(`/deals/${envelope.deal}/envelopes`)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
//       data: [results.envelope.create.data], Elements in envelope.recipients are showing up in random order which messes the tests
      info: {
        count: 1
      }
    })
    .expectJSONTypes({
      data: [envelope_response],
      code: String
    })
}

const getPdf = cb => {
  return frisby.create('get a single PDF file containing all docs')
    .head(`/envelopes/${results.envelope.create.data.id}.pdf`)
    .after(cb)
    .expectStatus(200)
    .expectHeader('content-type', 'application/pdf')
}

const getDocumentPdf = cb => {
  return frisby.create('get PDF file for first document of envelope')
    .head(`/envelopes/${results.envelope.create.data.id}/1.pdf`)
    .after(cb)
    .expectStatus(200)
    .expectHeader('content-type', 'application/pdf')
}

const sign = cb => {
  return frisby.create('Go to "sign envelope" page')
    .get(`/envelopes/${results.envelope.create.data.id}/sign`)
    .after(cb)
    .expectStatus(200)
}

const voidit = cb => {
  return frisby.create('void an envelope')
    .patch(`/envelopes/${results.envelope.create.data.id}/status`, {
      status: 'Voided'
    })
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: {
        status: 'Voided'
      }
    })
    .expectJSONTypes({
      data: envelope_response,
      code: String
    })
}

module.exports = {
  create412,
  authenticate,
  saveToken,
  create,
  get,
  getDealEnvelopes,
  getPdf,
  getDocumentPdf,
  sign,
  voidit
}
