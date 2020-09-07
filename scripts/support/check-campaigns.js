const config = require('../../lib/config')
const amqplib = require('amqplib')

async function main() {
  const conn = await amqplib.connect(config.amqp.connection)
  const ch = await conn.createChannel()

  const set = new Set()

  ch.consume('email_campaign.error', msg => {
    // if (msg) ch.nack(msg)

    const body = JSON.parse(msg?.content.toString('utf-8') || '{}')
    set.add(body.args[0])
  })

  const shutdown = async () => {
    ch.nackAll(true)
    console.log(set)

    await ch.close()
    await conn.close()
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

main().catch(ex => console.error(ex))
