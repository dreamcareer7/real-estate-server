const { syncCalendar } = require('./workers/job_cal')
const { syncGmail }    = require('./workers/job_gmail')


const test = async (req, res) => {
  let result

  const cid = '7a17812c-3c82-4717-b8b5-994cab4ebbe8'

  const data = {
    cid
  }

  await syncGmail(data)

  return res.json(result || {})
}


module.exports = {
  test
}