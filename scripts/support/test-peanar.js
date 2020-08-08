const amqplib = require('amqplib')
const fs = require('fs')
const content = fs.readFileSync('/home/abbas/examples.desktop')

const QUEUE_NAME = `queue_${process.pid}`

console.log(QUEUE_NAME)

const MAX = 50000

const run = async () => {
  const conn = await amqplib.connect('amqp://guest:guest@localhost/')
  const channel = await conn.createChannel()

  channel.assertQueue(QUEUE_NAME)


  let i = 0
  const enqueue = () => {
    i++
    console.time(`${i}`)
    channel.sendToQueue(QUEUE_NAME, content)

    if (i >= MAX) {
      clearInterval(interval)
      console.time('end')
    }

  }

  const interval = setInterval(enqueue, 1)

  let j = 0

  const consume = msg => {
    j++
    console.timeEnd(`${j}`)

    if (j >= MAX) {
      console.log('End')
      channel.nackAll(false)
      console.timeEnd('end')
    }
  }

  channel.consume(QUEUE_NAME, consume)
}

run().catch(e => {
  console.log(e)
  process.exit()
}).then(() => {
//   process.exit()
})
