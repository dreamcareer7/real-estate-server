const fs = require('fs')
const path = require('path')
const Crypto = require('../../../lib/models/Crypto')
const b64 = require('base64url').default

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
        title: 'New Lead: Test Rechat3',
        message: 'This a test from Rechat! I would like to schedule a showing for 8904 Maple Glen Drive, Dallas, TX 75231 (14446066)',
        notification_type: 'UserCapturedContact',
      }]
    })
}

module.exports = {
  dumpLtsLead,
  checkContactForLead,
  checkNotifications
}
