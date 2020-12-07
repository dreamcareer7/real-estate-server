const { syncCalendar } = require('./workers/job_cal')
const { syncGmail }    = require('./workers/job_gmail')
const { syncContacts } = require('./workers/job_contacts')
const { syncGmailByQuery }  = require('./workers/job_gmail_query')
const { syncContactsAvatars } = require('./workers/job_contacts_avatars')

const UserJob = require('../UsersJob/get')


const test = async (req, res) => {
  let result


  const cid = '7a17812c-3c82-4717-b8b5-994cab4ebbe8'

  const data = {
    cid
  }

  await syncContactsAvatars(data)


  // const userJob = await UserJob.get('d6cde000-ba9b-42ad-973e-b431883c55d6')

  // const data_2 = {
  //   action: 'sync_gmail_by_query',
  //   ...userJob
  // }

  // await syncGmailByQuery(data_2)


  return res.json(result || {})
}


module.exports = {
  test
}