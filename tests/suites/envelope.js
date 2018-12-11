const fs = require('fs')

const envelope = require('./envelope/data.js')
const envelope_response = require('./envelope/types.js')
const webhook = fs.readFileSync(__dirname + '/envelope/webhook.xml').toString()

registerSuite('deal', ['create', 'addRole', 'addChecklist', 'addTask', 'setSubmission'])

const setEnvelopeDetails = envelope => {
  envelope.documents[0].revision = results.deal.setSubmission.data.last_revision

  envelope.deal = results.deal.create.data.id

  envelope.recipients.push({
    role: results.deal.addRole.data[0].id
  })

  envelope.recipients.push({
    role: results.deal.addRole.data[1].id
  })
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


const sign = cb => {
  return frisby.create('Go to "sign envelope" page')
    .get(`/envelopes/${results.envelope.create.data.id}/sign/${results.envelope.create.data.recipients[0].id}`)
    .after(cb)
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

const resend = cb => {
  return frisby.create('resend an envelope')
    .post(`/envelopes/${results.envelope.create.data.id}/resend`)
    .after(cb)
    .expectStatus(200)
}

const updateStatus = cb => {
  const envelope = results.envelope.create.data

  // eslint-disable-next-line no-eval
  const body = eval('`' + webhook + '`')

  const headers = {
    'Content-Type': 'text/xml',
    'Content-Length': body.length
  }

  return frisby.create('update status')
    .post(`/envelopes/${envelope.id}/hook?token=${envelope.webhook_token}`, {}, {
      json: false,
      headers,
      body
    })
    .after(cb)
    .expectStatus(200)
}

const checkEnvelope = cb => {
  return frisby.create('Check if envelope is updated properly')
    .get(`/envelopes/${results.envelope.create.data.id}`)
    .after(cb)
    .expectJSON({
      data: {
        status: 'Completed',
        recipients: [
          { status: 'Completed' },
          { status: 'Completed' }
        ]
      }
    })
    .expectStatus(200)
}

const checkTask = cb => {
  return frisby.create('Check if the task is submitted')
    .get(`/deals/${results.envelope.create.data.deal}?associations[]=deal.checklists&associations[]=deal_checklist.tasks&associations[]=task.room`)
    .after(cb)
    .expectJSON({
      data: {
        checklists: [
          {
            tasks: [
              {},
              {
                id: results.deal.addTask.data.id
              }
            ]
          }
        ]
      }
    })
    .expectStatus(200)
}

module.exports = {
  create412,
  saveToken,
  create,
  get,
  getDealEnvelopes,
  sign,
  voidit,
  resend,
  updateStatus,
  checkEnvelope,
  checkTask
}
