const { save: realtorWorker } = require('./Realtor/save')
const { save: zillowWorker } = require('./Zillow/save')

const save = (lead) => {
  if (lead.source === 'Realtor') {
    return realtorWorker(lead)
  } else if (lead.source === 'Zillow') {
    return zillowWorker(lead)
  }

  const err = new Error('INVALID LEAD SOURCE TYPE')
  err.retry = false
  throw err

}

module.exports = {
  save,
}
