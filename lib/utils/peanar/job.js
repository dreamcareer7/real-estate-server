const { PeanarAdapterError } = require('./exceptions')

class PeanarJob {
  /**
   * @param {import('./peanar').IPeanarJob} req
   * @param {import('ts-amqp/dist/classes/ChannelN').default} channel
   */
  constructor(req, channel) {
    this.id = req.id
    this.name = req.name
    this.args = req.args
    this.correlationId = req.correlationId || req.id
    this.queue = req.queue
    this.replyTo = req.replyTo
    this.deliveryTag = req.deliveryTag

    this.handler = req.handler

    this.channel = channel
  }

  ack() {
    if (!this.channel) throw new PeanarAdapterError('Worker: AMQP connection lost!')

    this.channel.basicAck(this.deliveryTag, false)
  }

  async perform() {
    return await this.handler.apply(null, this.args)
  }
}

module.exports = PeanarJob
