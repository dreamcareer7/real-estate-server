const SocketServer = require('../../socket')
const Context = require('../Context')
const queue = require('../../utils/queue.js')

const {
  OFFLINE
} = require('./constants')

const getStatus = function(user, _cb) {
  if (SocketServer.ready) {
    const status = SocketServer.getUserStatus(user)
    return _cb(null, status)
  }

  let responded = false
  const cb = (err, result) => {
    if (responded) return

    responded = true
    _cb(err, result)
  }

  const c = Context.getActive()

  const job = queue
    .create('socket_user_status', { user })
    .removeOnComplete(true)

  job.on('complete', status => {
    c.enter()
    cb(null, status)
  })

  const fail = () => {
    cb(null, OFFLINE)
  }

  // eslint-disable-next-line handle-callback-err
  job.on('failed', err => {
    c.enter()
    fail()
  })

  setTimeout(fail, 100)

  job.save()
}

module.exports = {
  getStatus
}
