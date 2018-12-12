const config = require('../../config')

let amqplib = require('amqplib')

// if (process.env.NODE_ENV === 'tests')
//   amqplib = require('./mock')


let cached = {}
let conn

const rabbit = async q => {
  if (cached[q])
    return cached[q]

  const reconnect = async () => {
    Context.log('[Rabbit] Connecting')
    conn = await amqplib.connect(config.amqp.connection)

    conn.on('close', async () => {
      Context.log('[Rabbit] Connection Closed')
      cached = {}
      conn = null
    })
  }

  await reconnect()

  const recreate = async () => {
    const channel = await conn.createChannel()

    channel.on('close', () => {
      Context.log('[Rabbit] Channel Closed')
      delete cached[q]
    })

    const queue = await channel.assertQueue(q, {
      durable: true
    })

    cached[q] = { channel, queue }
  }

  await recreate()

  return cached[q]
}

module.exports = rabbit
