const { save: realtorWorker } = require('./Realtor/save')
const { save: zillowWorker } = require('./Zillow/save')
const Context = require('../../../Context')

const save = (lead) => {
  Context.log(`lead channel worker is called ${lead}`)
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
