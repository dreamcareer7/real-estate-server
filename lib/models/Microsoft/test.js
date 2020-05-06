const MicrosoftCredential = require('./credential')
const { syncCalendar } = require('./workers/job_cal')
// const { syncMicrosoft } = require('./workers/job_outlook')



const test = async (req, res) => {
  const cid = 'debcc087-fd59-4635-8fda-d65264ee82cf'

  const microsoftCredential = await MicrosoftCredential.get(cid)

  const data = {
    microsoftCredential
  }

  await syncCalendar(data)

  return res.json({})
}

module.exports = {
  test
}