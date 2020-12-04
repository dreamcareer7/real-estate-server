const { peanar } = require('../../../../../utils/peanar')

const { syncContactsAvatars } = require('../../job_contacts')


module.exports = {
  syncContactsAvatars: peanar.job({
    handler: syncContactsAvatars,
    name: 'syncMicrosoftContactsAvatars',
    queue: 'microsoft_contacts_avatars',
    exchange: 'microsoft'
  })
}