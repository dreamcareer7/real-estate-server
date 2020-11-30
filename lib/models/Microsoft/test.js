const { syncOutlook }  = require('./workers/job_outlook')
const { syncCalendar } = require('./workers/job_cal')
const { syncContacts } = require('./workers/job_contacts')
const { syncOutlookByQuery }  = require('./workers/job_outlook_query')


const test = async (req, res) => {
  const cid = 'c43f5cdb-c822-4208-9cd6-ac2658b0af1a'

  const data = {
    action: 'sync_outlook_by_query',
    cid,
    metadata: {'contact_address':'saeed.uni68@gmail.com'},
    immediate: false
  }

  await syncOutlookByQuery(data)

  return res.json({})
}

module.exports = {
  test
}