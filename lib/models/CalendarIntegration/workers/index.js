const { peanar }    = require('../../../utils/peanar')
const { resetEtag } = require('./worker')


const Integration = {
  resetEtagByCrmTask: peanar.job({
    handler: resetEtag,
    name: 'resetCalendarEtag',
    queue: 'calendar_integration',
    exchange: 'calendar_integration'
  })
}


module.exports = Integration