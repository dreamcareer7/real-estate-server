// const { syncOutlook }  = require('./workers/job_outlook')
// const { syncCalendar } = require('./workers/job_cal')
const { syncContacts } = require('./workers/job_contacts')
// const { syncOutlookByQuery } = require('./workers/job_outlook_query')
// const { syncContactsAvatars } = require('./workers/job_contacts_avatars')

// const { get } = require('../Microsoft/credential/get')
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
  const cid = req.query.cid

  // const credential = await get(cid)
  // await insertContactAvatarJob(credential)
  // await syncContactsAvatars({ cid })

  await syncContacts({ cid })

  // const userJob = await UserJob.get(cid)
  // const data_2 = { ...userJob }
  // await syncOutlookByQuery(data)


  // await syncCalendar({ cid })

  // throw new Error('temp err!')
  return res.json({})
}

module.exports = {
  insertContactAvatarJob,
  test
}