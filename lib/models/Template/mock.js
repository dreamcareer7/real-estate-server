const assertQueue = (queue = 'Mock-Queue-Name', options) => {
  return {
    queue
  }
}

const callbacks = {}

const sendToQueue = (q, content, options) => {
  const { replyTo } = options
  callbacks[replyTo]()
}

const consume = (q, callback) => {
  callbacks[q] = callback
}

const ack = () => {}

const createChannel = async () => {
  const on = () => {}

  return {
    assertQueue,
    sendToQueue,
    consume,
    ack,
    on
  }
}

const connect = async () => {
  const on = () => {}

  return { createChannel, on }
}

module.exports = { connect }
