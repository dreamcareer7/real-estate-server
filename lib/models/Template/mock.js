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
  return {
    assertQueue,
    sendToQueue,
    consume,
    ack
  }
}

const connect = async () => {
  return { createChannel }
}

module.exports = { connect }
