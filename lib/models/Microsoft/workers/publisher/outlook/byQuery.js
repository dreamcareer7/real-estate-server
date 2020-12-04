const { peanar } = require('../../../../../utils/peanar')

const { syncOutlookByQuery } = require('../../job_outlook_query')


module.exports = {
  syncOutlookByQuery: peanar.job({
    handler: syncOutlookByQuery,
    name: 'syncOutlookByQuery',
    queue: 'outlook_by_query',
    exchange: 'microsoft'
  })
}