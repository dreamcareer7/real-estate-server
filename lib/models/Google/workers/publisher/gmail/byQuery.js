const { peanar } = require('../../../../../utils/peanar')

const { syncGmailByQuery } = require('../../job_gmail_query')


module.exports = {
  syncGmailByQuery: peanar.job({
    handler: syncGmailByQuery,
    name: 'syncGmailByQuery',
    queue: 'gmail_by_query',
    exchange: 'google'
  })
}