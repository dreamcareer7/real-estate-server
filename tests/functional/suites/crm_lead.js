const fs = require('fs')
const path = require('path')
const Crypto = require('../../../lib/models/Crypto')
const b64 = require('base64url').default
const mailgunPayload = require('./data/mailgun_payload')
const config = require('../../../lib/config')

registerSuite('brand', [
  'createParent',
  'attributeDefs',
  'createBrandLists',
  'create',
  'addRole',
  'addMember'
])

registerSuite('user', ['create', 'upgradeToAgentWithEmail', 'markAsNonShadow'])

const dumpLtsLead = cb => {
  const payload = fs.createReadStream(path.resolve(__dirname, 'data/lts_lead.xml'), { encoding: 'utf-8' })
  const keyData = {
    user: results.authorize.token.data.id,
    brand: results.brand.create.data.id,
    protocol: 'LeadTransmissionStandard',
    mls: ['NTREIS'],
    source: 'AgentWebsite'
  }

  const key = b64.encode(Crypto.encrypt(JSON.stringify(keyData)))

  return frisby
    .create('create a LTS lead')
    .post(`/contacts/leads/${key}`, payload, { json: false })
    .addHeader('content-type', 'text/xml')
    .addHeader('x-handle-jobs', 'yes')
    .after(function(err, res, json) {
      const setup = frisby.globalSetup()

      setup.request.headers['X-RECHAT-BRAND'] = results.brand.create.data.id
      setup.request.headers['x-handle-jobs'] = 'yes'

      frisby.globalSetup(setup)

      cb(err, res, json)
    })
    .expectStatus(204)
}

/**
 * We need this to ensure the user will be notified
 */
const patchUserLastSeen = cb => {
  return frisby.create('patch user last_seen')
    .post('/jobs', {
      queue: 'save_last_seen',
      name: 'save_last_seen',
      data: {
        user_id: results.authorize.token.data.id,
        client_id: config.tests.client_id,
        time: new Date()
      }
    })
    .after(cb)
    .expectStatus(200)
}

const checkContactForLead = cb => {
  return frisby
    .create('check if the lead was added to the contacts')
    .post('/contacts/filter')
    .after(cb)
    .expectJSON({
      data: [{
        first_name: 'Test',
        last_name: 'Rechat3'
      }]
    })
}

const checkNotifications = cb => {
  return frisby
    .create('check if the was notified of the new lead')
    .get('/notifications')
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      data: [{
        title: 'Website Lead: Test Rechat3',
        message: 'This a test from Rechat! I would like to schedule a showing for 8904 Maple Glen Drive, Dallas, TX 75231 (14446066)',
        notification_type: 'UserCapturedContact',
      }]
    })
}

const checkLeadEmailParser = cb => {
  return frisby
    .create('check lead email parser')
    .post('/webhook/contacts/leads/email', {
      'body-html': mailgunPayload,
      'recipient': 'test@rechat.com',
    })
    .after(cb)
    .expectStatus(204)
}

const checkContactCreated = cb => {
  return frisby
    .create('check if last contact exists with email capture')
    .get('/contacts')
    .after((err, res, json) => {
      const email = 'scgators7@gmail.com'
      let exists = false
      for (const i in json.data) {
        if (json.data[i].email === email) {
          exists = true
          break
        }
      }
      if (!exists) throw `email ${email} must exists due lead email parser body`
      cb(err, res, json)
    })
    .expectStatus(200)
}

module.exports = {
  dumpLtsLead,
  checkContactForLead,
  checkNotifications,  
  patchUserLastSeen,
  checkLeadEmailParser,
  checkContactCreated
}
