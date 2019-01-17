const redis = require('redis')
const store = require('./store-internal')
const config = require('../../config')
const uuid = require('node-uuid')

const pub = redis.createClient(config.redis)
const sub = redis.createClient(config.redis)

const ADD = 'add'
const REMOVE = 'remove'
const BROADCAST_REQUEST = 'broadcast request'
const HEARTBEAT = 'heartbeat'
const WORKER_DOWN = 'worker down'

const CHANNEL = 'rechat.users'

const worker = uuid.v1()

const add = ({user, socket}) => {
  store.add({user,socket,worker})

  const message = {
    type: ADD,
    user,
    socket,
    worker
  }

  pub.publish(CHANNEL, JSON.stringify(message))
}

const remove = ({user, socket}) => {
  store.remove({user,socket,worker})

  const message = {
    type: REMOVE,
    user,
    socket,
    worker
  }

  pub.publish(CHANNEL, JSON.stringify(message))
}

const heartbeat = () => {
  const message = {
    type: HEARTBEAT,
    worker
  }

  pub.publish(CHANNEL, JSON.stringify(message))

  cleanDeadWorkers()
}

const broadcastRequest = () => {
  const message = {
    type: BROADCAST_REQUEST
  }

  pub.publish(CHANNEL, JSON.stringify(message))
}
broadcastRequest()

setInterval(heartbeat, 5000)

const addListener = message => {
  store.add({
    socket: message.socket,
    user: message.user,
    worker: message.worker
  })
}

const removeListener = message => {
  store.remove({
    socket: message.socket,
    user: message.user
  })
}

const broadcastRequestListener = message => {
  const sockets = store.byWorker(worker)

  for(const socket_id in sockets) {
    const item = sockets[socket_id]

    const payload = {
      type: ADD,
      ...item
    }

    pub.publish(CHANNEL, JSON.stringify(payload))
  }
}

const workers = {}

const cleanDeadWorkers = () => {
  const active_workers = store.getWorkers()

  const now = Date.now()

  for(const worker of active_workers) {
    const last_seen = workers[worker]

    if (now > (last_seen + 15 * 1000))
      workerDown(worker)
  }
}

const workerDown = worker => {
  const sockets = store.byWorker(worker)

  for(const socket in sockets) {
    store.remove({
      user: sockets[socket].user,
      socket,
      worker
    })
  }
}

process.on('SIGTERM', () => {
  const payload = {
    type: WORKER_DOWN,
    worker
  }

  pub.publish(CHANNEL, JSON.stringify(payload))
})

const heartbeatListener = message => {
  workers[message.worker] = Date.now()
}

const workerDownListener = message => {
  workerDown(message.worker)
}

const listeners = {}

listeners[ADD] = addListener
listeners[REMOVE] = removeListener
listeners[BROADCAST_REQUEST] = broadcastRequestListener
listeners[HEARTBEAT] = heartbeatListener
listeners[WORKER_DOWN] = workerDownListener

sub.subscribe(CHANNEL)

sub.on('message', (channel, payload) => {
  const message = JSON.parse(payload)
  listeners[message.type](message)
})

const isOnline = store.isOnline

module.exports = {
  add,
  remove,
  isOnline
}