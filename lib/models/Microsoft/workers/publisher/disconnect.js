const { peanar } = require('../../../../utils/peanar')
const { disconnect, disconnectAllForUser } = require('../job_disconnect')



module.exports = {
  credential: peanar.job({
    handler: disconnect,
    name: 'disconnectMicrosoft',
    queue: 'microsoft_disconnect',
    exchange: 'microsoft'
  }),

  disconnectAllForUser: peanar.job({
    handler: disconnectAllForUser,
    name: 'disconnectAllMicrosoft',
    queue: 'microsoft_disconnect',
    exchange: 'microsoft'
  })
}