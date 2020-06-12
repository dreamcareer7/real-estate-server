const { syncOutlook }  = require('./workers/job_outlook')
const { syncCalendar } = require('./workers/job_cal')
const { syncContacts } = require('./workers/job_contacts')



const test = async (req, res) => {
  const cid = 'c43f5cdb-c822-4208-9cd6-ac2658b0af1a'

  const data = {
    cid
  }

  await syncCalendar(data)

  return res.json({})
}

module.exports = {
  test
}