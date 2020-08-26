const { peanar } = require('../../../../utils/peanar')

const { disconnect } = require('../job_disconnect')


module.exports = {
  credential: peanar.job({
    handler: disconnect,
    name: 'disconnectMicrosoft',
    queue: 'microsoft_disconnect',
    exchange: 'microsoft'
  })
}