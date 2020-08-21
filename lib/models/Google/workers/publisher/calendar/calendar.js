const { peanar } = require('../../../../../utils/peanar')

const { syncCalendar } = require('../../job_cal')


module.exports = {
  syncCalendar: peanar.job({
    handler: syncCalendar,
    name: 'syncGoogleCalendar',
    queue: 'google_cal',
    exchange: 'google'
  })
}