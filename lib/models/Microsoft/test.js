const { syncOutlook }  = require('./workers/job_outlook')
const { syncCalendar } = require('./workers/job_cal')
const { syncContacts } = require('./workers/job_contacts')
const { syncOutlookByQuery } = require('./workers/job_outlook_query')

const UserJob = require('../UsersJob/get')


const test = async (req, res) => {
  // const cid = 'c43f5cdb-c822-4208-9cd6-ac2658b0af1a'

  // const data = {
  //   action: 'sync_outlook',
  //   cid
  // }

  // await syncContacts(data)


  const userJob = await UserJob.get('53c9e0ef-6a68-41e6-9ab6-895abb2c57bc')

  const data_2 = {
    action: 'sync_outlook_by_query',
    ...userJob
  }

  await syncOutlookByQuery(data_2)



  return res.json({})
}

module.exports = {
  test
}