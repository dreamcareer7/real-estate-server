const Context = require('../../Context')
const Socket = require('../../Socket')

/**
 * @param {string} socket_event
 * @param {UUID} job_id 
 * @param {UUID} user_id 
 * @param {any=} result 
 */
function sendSuccessSocketEvent(socket_event, job_id, user_id, result) {
  Context.log('>>> Job import csv completed. Sending socket event to clients...')

  return Socket.send(
    socket_event,
    user_id,
    [{
      result,
      state: 'complete',
      job_id
    }],

    (err) => {
      if (err)
        Context.error('>>> (Socket) Error sending task failure socket event.', err)
    }
  )
}

/**
 * @param {string} socket_event
 * @param {UUID} job_id 
 * @param {UUID} user_id 
 * @param {any} err
 */
function sendFailureSocketEvent(socket_event, job_id, user_id, err) {
  Context.log('>>> Job import csv failed. Sending socket event to clients...')
  Context.error(err)

  return Socket.send(
    socket_event,
    user_id,
    [{
      state: 'failed',
      error: err instanceof Error ? err.message : err.toString(),
      job_id
    }],

    (err) => {
      if (err)
        Context.error('>>> (Socket) Error sending task failure socket event.', err)
    }
  )
}

module.exports = {
  sendSuccessSocketEvent,
  sendFailureSocketEvent
}
