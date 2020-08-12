const Context = require('../Context')
const queue   = require('../../utils/queue.js')

const mock = (event, room, args, cb) => {
  if (cb)
    return cb()
}

const send = (event, room, args, cb) => {
  const context = Context.getActive()

  Context.log('Requesting Socket Event', event, 'to', room)
  const job = queue.create('socket_emit', {room, event, args}).ttl(500).removeOnComplete(true)

  job.on('complete', results => {
    if (!cb)
      return

    conext.run(cb, null, result)
  })

  job.on('failed', (err) => {
    if (cb)
      context.run(cb, err)

    job.remove()
  })

  job.save(err => {
    if (err)
      console.log('Error while saving job', err)
  })
}

const isTest = process.env.NODE_ENV === 'tests'

module.exports = {
  send: isTest ? mock : send
}
