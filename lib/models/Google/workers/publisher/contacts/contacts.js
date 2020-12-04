const { peanar } = require('../../../../../utils/peanar')

const { syncContacts } = require('../../job_contacts')


module.exports = {
  syncContacts: peanar.job({
    handler: syncContacts,
    name: 'syncGoogleContacts',
    queue: 'google_contacts',
    exchange: 'google'
  })
}