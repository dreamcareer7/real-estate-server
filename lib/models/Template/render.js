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

      let consumerTag

      const handleReply = reply => {
        await channel.ack(reply)
        await channel.cancel(consumerTag)
        resolve(correlationId)
      }

      consumerTag = await channel.consume(replyTo, handleReply)

      const content = Buffer.from(JSON.stringify({ html, presigned, width, height }))

      channel.sendToQueue(queue_name, content, { correlationId, replyTo })
    } catch(e) {
      reject(e)
    }
  })
}

module.exports = render
