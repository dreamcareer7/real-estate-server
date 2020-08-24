const { peanar } = require('../../../../../utils/peanar')

const { syncGmail } = require('../../job_gmail')


module.exports = {
  syncGmail: peanar.job({
    handler: syncGmail,
    name: 'syncGmail',
    queue: 'google',
    exchange: 'google'
  })
}