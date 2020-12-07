const { syncCalendar } = require('./workers/job_cal')
const { syncGmail }    = require('./workers/job_gmail')
const { syncContacts } = require('./workers/job_contacts')
const { syncGmailByQuery }  = require('./workers/job_gmail_query')
const { syncContactsAvatars } = require('./workers/job_contacts_avatars')

const { get } = require('../Google/credential/get')
const UsersJob = require('../UsersJob')


const insertContactAvatarJob = async (credential) => {
  const jobName    = 'contact_avatar'
  const status     = null
  const metadata   = null
  const recurrence = false

  const userJob = await UsersJob.find({ gcid: credential.id, mcid: null, jobName, metadata })

  if (!userJob) {
    return await UsersJob.upsertByMicrosoftCredential(credential, jobName, status, metadata, recurrence)
  }

  if ( userJob && userJob.deleted_at ) {
    return await UsersJob.restoreById(userJob.id)
  }
}

const test = async (req, res) => {
  const cid = '7a17812c-3c82-4717-b8b5-994cab4ebbe8'
  const data = { cid }


  const credential = await get(data.cid)
  await insertContactAvatarJob(credential)
  await syncContactsAvatars(data)


  // const userJob = await UserJob.get('d6cde000-ba9b-42ad-973e-b431883c55d6')
  // const data_2 = { ...userJob }


  // await syncGmailByQuery(data)


  return res.json({})
}


module.exports = {
  test
}