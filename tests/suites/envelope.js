const envelope = require('./envelope/data.js')
const envelope_response = require('./envelope/types.js')

registerSuite('submission', ['create'])

const setEnvelopeDetails = envelope => {
  envelope.documents[0].revision = results.submission.create.data.last_revision

  envelope.deal = results.deal.create.data.id

  envelope.recipients[0].firstName = 'Emil'
  envelope.recipients[0].lastName = 'Sedgh'
  envelope.recipients[0].email = 'emil@rechat.com'

  // Add myself as a recipient so later I can sign this as well
  envelope.recipients[1].user = results.authorize.token.data.id
}

const create412 = cb => {
  setEnvelopeDetails(envelope)

  return frisby.create('create an envelope before authenticating with docusign and expect a 412')
    .post('/envelopes', envelope)
    .after(cb)
    .expectStatus(412)
    .expectJSON({
      http: 412,
      code: 'DocusignAuthenticationRequired'
    })
}


const saveToken = cb => {
  const qs = ` 'code=eyJ0eXAiOiJNVCIsImFsZyI6IlJTMjU2Iiwia2lkIjoiNjgxODVmZjEtNGU1MS00Y2U5LWFmMWMtNjg5ODEyMjAzMzE3In0.AQkAAAABAAYABwCAam7HPKzUSAgAgPb0Dj2s1EgCAG7W7ytRDJhNtZCC_6cHr7wNACQAAAA0NjMyZTNiZC0zNTAyLTQ3MmMtOGYwYS1hZTc1NGI1ODYwZDIVAAEAAAASAAAAAAAYAAEAAAAFAAAAIACAam7HPKzUSA.SO-HzaT5ZuAbeSyaAKrTWy8Zf41ac3fKzSEPhF-EASNQQibCRaptn2w3zpN6zwhamiyYytokYNp0kfhr9M_FKr6aWBd2KqPNdCqYKUdRj1mwK31hUbz5NoWZQV0nIZ32JCvMCrDWThLXkAChpQt_xYJu9YBRSt9wOwMet2nPurY38aaIkoZbLKybOhqiZzA_cPvuud2kFfDLughBK6zOpAgcCVGtFnsV6ZntdE2Sfp0daCsmYvV1CNPfFURr7eOYcDbwd6CB4sSCXHuSLBb8ykjVoe7F6s5CL23lEVibnFKjQIKjb_8VOJ6oKk0wKji_19NcHr1nQbNsLT1Fktcydg&state={%22signature%22:%22oJ3OTil3V6FPb7iUGcsMfvhQ%2FWPLIYaZl90TA6jOCTIqTgOvWti%2FEAM9%2BQnfOSni1hk5smfPud%2Fvc62EEqsXZZBBo0wIRMu3r8Qf3iSetwNogCL2Hu6gMagSWhWJ81FKNE5ZSP%2BikT9PkHhgJH11S%2FUMJUMJcmwNApb2gdBgLdftOqxc4cSIOPdzrPcgy%2Bn%2Bvqdqu99%2BzZ76ysPWCIWksUCISf1NI%2BbP%2F1Di1QUJ74nouJGLATRWAKiYlx2Dj25u5yElfhc5n%2BEmZysEi9KJQ72L6ley5L6dyy1R5h%2BY7aHJFcw1RG0Kj%2BUm6O5pY8siKzqn55AZZk9IE%2Fe%2FVnEP6w%3D%3D%22%2C%22user_id%22:%22${results.authorize.token.data.id}%22}`

  return frisby.create('Save docusign token')
    .get(`/docusign/auth/done?${qs}`)
    .after(cb)
    .expectStatus(200)
}

const create = cb => {
  setEnvelopeDetails(envelope)

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
  saveToken,
  create,
  get,
  getDealEnvelopes,
  getPdf,
  getDocumentPdf,
  sign,
  voidit
}
