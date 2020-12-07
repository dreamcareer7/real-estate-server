const { syncOutlook }  = require('./workers/job_outlook')
const { syncCalendar } = require('./workers/job_cal')
const { syncContacts } = require('./workers/job_contacts')
const { syncOutlookByQuery } = require('./workers/job_outlook_query')
const { syncContactsAvatars } = require('./workers/job_contacts_avatars')

const UserJob = require('../UsersJob/get')


const test = async (req, res) => {
  const cid = 'c43f5cdb-c822-4208-9cd6-ac2658b0af1a'

  const data = {
    cid
  }

  await syncContactsAvatars(data)


  // const userJob = await UserJob.get('d6cde000-ba9b-42ad-973e-b431883c55d6')

  // const data_2 = {
  //   action: 'sync_outlook_by_query',
  //   ...userJob
  // }

  // await syncOutlookByQuery(data_2)

  return res.json({})
}

module.exports = {
  test
}