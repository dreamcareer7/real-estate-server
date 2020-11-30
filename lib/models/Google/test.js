const { syncCalendar } = require('./workers/job_cal')
const { syncGmail }    = require('./workers/job_gmail')
const { syncContacts } = require('./workers/job_contacts')
const { syncGmailByQuery }  = require('./workers/job_gmail_query')


const test = async (req, res) => {
  let result

  const cid = '7a17812c-3c82-4717-b8b5-994cab4ebbe8'

  const data = {
    action: 'sync_gmail_by_query',
    cid,
    metadata: {'contact_address':'saeed.uni68@gmail.com'},
    immediate: false
  }

  await syncGmailByQuery(data)

  return res.json(result || {})
}


module.exports = {
  test
}