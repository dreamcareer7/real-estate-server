let amqplib = require('amqplib')

if (process.env.NODE_ENV === 'tests')
  amqplib = require('./mock')

const cached = {}
let conn

const rabbit = async q => {
  if (cached[q])
    return cached[q]

  if (!conn)
    conn = await amqplib.connect('amqp://localhost')

  const channel = await conn.createChannel()

  const queue = await channel.assertQueue(q, {
    durable: true
  })

  cached[q] = { channel, queue }

  return cached[q]
}

module.exports = rabbit
