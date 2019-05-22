const google_auth_link = require('./expected_objects/google_auth_link.js')

registerSuite('agent', ['add'])
registerSuite('brand', ['createParent', 'create'])
registerSuite('contact', ['brandCreateParent', 'brandCreate'])

const GMAIL_ADDRESS = 'saeed.uni68@gmail.com'
const WEBHOOK_HOST  = 'http://127.0.0.1:3078'

function requestGmailAccess(cb) {
  const body = {
    email: GMAIL_ADDRESS
  }

  return frisby.create('Request Google auhoriziation link')
    .post('/users/self/google', body)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: google_auth_link
    })
}

function invalidGrantAccess(cb) {
  const key     = results.google.requestGmailAccess.data.key
  const code    = '4/UgGSAAwN9cxkLWP4ipdzNzvCeMH9-bqDM9N6vHqssQ7zWSy-AtSV4T-d53XyfXKQPE31A31MV9MY64t9RLO8Aiw'
  const scope   = 'https://mail.google.com/ https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/contacts.readonly'
  const webhook = `/webhook/google/grant/${key}?code=${code}&scope=${scope}`

  return frisby.create('Invalid grant-access to google-account')
    .get(webhook)
    .after(cb)
    .expectStatus(404)
    .expectJSON({
      "http": 404,
      "message": "Google-Auth-Link Bad-Credential",
      "code": "ResourceNotFound",
      "skip_trace_log": true
    })
}

function revokeAccess(cb) {
}


module.exports = {
  requestGmailAccess,
  invalidGrantAccess
  // revokeAccess
}