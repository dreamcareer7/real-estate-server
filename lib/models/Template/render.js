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

      const replyQueue = await channel.assertQueue(correlationId, {exclusive: true})
      const replyTo = replyQueue.queue

      const handleReply = reply => {
        channel.ack(reply)
        resolve(correlationId)
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
