const MicrosoftCredential = require('./credential')
const { syncCalendar } = require('./workers/job_cal')



const test = async (req, res) => {
  const cid = '1725cd25-0ab5-40fd-915a-b1132042ebe6'

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