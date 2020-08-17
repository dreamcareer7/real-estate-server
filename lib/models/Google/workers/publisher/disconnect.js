const { peanar } = require('../../../../utils/peanar')

const { disconnect } = require('../job_disconnect')


module.exports = {
  credential: peanar.job({
    handler: disconnect,
    name: 'disconnectGoogle',
    queue: 'google_disconnect',
    exchange: 'google'
  })
}