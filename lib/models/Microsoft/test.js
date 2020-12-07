const { syncOutlook }  = require('./workers/job_outlook')
const { syncCalendar } = require('./workers/job_cal')
const { syncContacts } = require('./workers/job_contacts')
const { syncOutlookByQuery } = require('./workers/job_outlook_query')
const { syncContactsAvatars } = require('./workers/job_contacts_avatars')

const { get } = require('../Microsoft/credential/get')
const UsersJob = require('../UsersJob')


const insertContactAvatarJob = async (credential) => {
  const jobName    = 'contact_avatar'
  const status     = null
  const metadata   = null
  const recurrence = false

  const userJob = await UsersJob.find({ gcid: null, mcid: credential.id, jobName, metadata })

  if (!userJob) {
    return await UsersJob.upsertByMicrosoftCredential(credential, jobName, status, metadata, recurrence)
  }

  if ( userJob && userJob.deleted_at ) {
    return await UsersJob.restoreById(userJob.id)
  }
}

const test = async (req, res) => {
  const cid = '2d03fe0f-97ce-4d9b-bd63-329d29a1710b' // 'c43f5cdb-c822-4208-9cd6-ac2658b0af1a'
  const data = { cid }


  const credential = await get(data.cid)
  await insertContactAvatarJob(credential)
  await syncContactsAvatars(data)


  // const userJob = await UserJob.get('d6cde000-ba9b-42ad-973e-b431883c55d6')
  // const data_2 = { ...userJob }


  // await syncOutlookByQuery(data)

  return res.json({})
}

module.exports = {
  test
}