const GoogleCredential = require('./credential')

const { syncCalendar } = require('./workers/job_cal')


const test = async (req, res) => {
  let result

  const cid = '7a17812c-3c82-4717-b8b5-994cab4ebbe8'

  const googleCredential = await GoogleCredential.get(cid)

  const data = {
    googleCredential
  }

  await syncCalendar(data)

  return res.json(result || {})
}


module.exports = {
  test
}