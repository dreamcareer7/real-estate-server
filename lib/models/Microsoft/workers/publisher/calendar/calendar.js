const { peanar } = require('../../../../../utils/peanar')

const { syncCalendar } = require('../../job_cal')


module.exports = {
  syncCalendar: peanar.job({
    handler: syncCalendar,
    name: 'syncMicrosoftCalendar',
    queue: 'microsoft_cal',
    exchange: 'microsoft'
  })
}