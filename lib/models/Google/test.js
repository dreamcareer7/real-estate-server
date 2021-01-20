// const { syncContacts } = require('./workers/job_contacts')
const { syncCalendar } = require('./workers/job_cal')
// const { syncGmail }    = require('./workers/job_gmail')
// const { syncGmailByQuery }    = require('./workers/job_gmail_query')
// const { syncContactsAvatars } = require('./workers/job_contacts_avatars')

// const { get }  = require('../Google/credential/get')
// const UsersJob = require('../UsersJob')


// const insertContactAvatarJob = async (credential) => {
//   const jobName    = 'contact_avatar'
//   const status     = null
//   const metadata   = null
//   const recurrence = false

//   const userJob = await UsersJob.find({ gcid: credential.id, mcid: null, jobName, metadata })

//   if (!userJob) {
//     return await UsersJob.upsertByMicrosoftCredential(credential, jobName, status, metadata, recurrence)
//   }

//   if ( userJob && userJob.deleted_at ) {
//     return await UsersJob.restoreById(userJob.id)
//   }
// }

const test = async (req, res) => {
  const cid = req.query.cid

  // const credential = await get(data.cid)
  // await insertContactAvatarJob(credential)
  // await syncContactsAvatars(data)


  // const userJob = await UserJob.get(cid)
  // const data_2 = { ...userJob }
  // await syncGmailByQuery(data)

  await syncCalendar({ cid })
  // await syncContacts({ cid })

  // throw new Error('temp err!')
  return res.json({})
}


module.exports = {
  test
}