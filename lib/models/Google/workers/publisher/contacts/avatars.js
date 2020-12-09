const { peanar } = require('../../../../../utils/peanar')

const { syncContactsAvatars } = require('../../job_contacts_avatars')


module.exports = {
  syncContactsAvatars: peanar.job({
    handler: syncContactsAvatars,
    name: 'syncGoogleContactsAvatars',
    queue: 'google_contacts_avatars',
    exchange: 'google'
  })
}