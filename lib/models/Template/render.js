const rabbit = require('./rabbit')
const uuid = require('node-uuid')

const SCREENSHOTS = 'screenshots'
const SCREENCASTS = 'screencasts'



const render = async ({template, html, presigned, width, height}) => {
  return new Promise(async (resolve, reject) => {
    try {
      const queue_name = template.video ? SCREENCASTS : SCREENSHOTS

      const { channel } = await rabbit(queue_name)

      const correlationId = uuid.v1()

      const replyQueue = await channel.assertQueue(correlationId, {exclusive: true, autoDelete: true})
      const replyTo = replyQueue.queue

      const handleReply = async reply => {
        resolve(correlationId)
        await channel.ack(reply)
        await channel.deleteQueue(replyTo) // We're done with this queue. Delete it.
      }

      channel.consume(replyTo, handleReply)

      const content = Buffer.from(JSON.stringify({ html, presigned, width, height }))

      channel.sendToQueue(queue_name, content, { correlationId, replyTo })
    } catch(e) {
      reject(e)
    }
  })
}

module.exports = render
