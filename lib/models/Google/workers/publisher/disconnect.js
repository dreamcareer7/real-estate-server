const { peanar } = require('../../../../utils/peanar')
const { disconnect, disconnectAllForUser } = require('../job_disconnect')


module.exports = {
  credential: peanar.job({
    handler: disconnect,
    name: 'disconnectGoogle',
    queue: 'google_disconnect',
    exchange: 'google'
  }),

  disconnectAllForUser: peanar.job({
    handler: disconnectAllForUser,
    name: 'disconnectAllGoogle',
    queue: 'google_disconnect',
    exchange: 'google'
  })
}