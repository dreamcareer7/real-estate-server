const { peanar }    = require('../../../utils/peanar')
const { resetEtag } = require('./worker')


const Integration = {
  resetEtagByContact: peanar.job({
    handler: resetEtag,
    name: 'resetEtag',
    queue: 'contact_integration',
    exchange: 'contact_integration'
  })
}


module.exports = Integration