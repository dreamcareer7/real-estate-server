const rabbit = require('./rabbit')
const uuid = require('node-uuid')

const SCREENSHOTS = 'screenshots'
const SCREENCASTS = 'screencasts'

const prints = [
  Template.LETTER
]

const render = async ({template, html, presigned, width, height}) => {
  return new Promise(async (resolve, reject) => {
    try {
      const queue_name = template.video ? SCREENCASTS : SCREENSHOTS
      const type = prints.includes(template.medium) ? 'PDF' : 'IMAGE'

      const { channel } = await rabbit(queue_name)

      const correlationId = uuid.v1()
      Context.log('Correlation ID for', correlationId)

      const replyQueue = await channel.assertQueue(correlationId, {exclusive: true, autoDelete: true})
      const replyTo = replyQueue.queue

      const { consumerTag } = await channel.consume(replyTo, async reply => {
        resolve(correlationId)
        await channel.ack(reply)
        await channel.cancel(consumerTag)
      })


      const content = Buffer.from(JSON.stringify({ html, presigned, width, height, type }))

      channel.sendToQueue(queue_name, content, { correlationId, replyTo })
    } catch(e) {
      reject(e)
    }
  })
}

module.exports = render
