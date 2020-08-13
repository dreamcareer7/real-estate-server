const { peanar } = require('../../../../../utils/peanar')

const { syncOutlook } = require('../../job_outlook')


module.exports = {
  syncOutlook: peanar.job({
    handler: syncOutlook,
    name: 'syncOutlook',
    queue: 'microsoft',
    exchange: 'microsoft'
  })
}