const { Transform } = require('stream')

class PeanarConsumer extends Transform {
  /**
   * @param {import('./app')} app 
   * @param {import('ts-amqp/dist/classes/ChannelN').default} channel
   * @param {string} queue
   */
  constructor(app, channel, queue) {
    super({
      objectMode: true
    })

    this.app = app
    this.channel = channel
    this.queue = queue
  }

  /**
   * @param {string} name 
   */
  getJobDefinition(name) {
    const queue_mapping = this.app.registry.get(this.queue)
    
    if (!queue_mapping) return

    return queue_mapping.get(name)
  }

  /**
   * @param {Buffer} body 
   * @returns {{ id: string; name: string; args: any[]; correlationId?: string; } | null}
   */
  _parseBody(body) {
    try {
      return JSON.parse(body.toString('utf-8'))
    }
    catch (ex) {
      return null
    }
  }

  /**
   * @param {import('ts-amqp/dist/interfaces/Basic').IDelivery} delivery
   * @param {string} _encoding
   * @param {import('stream').TransformCallback} cb
   */
  _transform(delivery, _encoding, cb) {
    if (!delivery.body) {
      console.warn('PeanarConsumer#_transform: Delivery without body!')
      return cb()
    }

    this.app.log(`PeanarConsumer: _transform(${JSON.stringify(delivery.body.toString('utf-8'), null, 2)})`)

    const body = this._parseBody(delivery.body)

    if (!body || !body.name || body.name.length < 1) {
      console.warn('PeanarConsumer#_transform: Invalid message body!')
      return cb()
    }

    /** @type {import('./peanar').IPeanarJobDefinition=} */
    const job = this.getJobDefinition(body.name)

    if (!job) {
      console.warn(`PeanarConsumer#_transform: No handler registered for ${this.queue}.${body.name}!`)
      return cb()
    }

    /** @type {import('./peanar').IPeanarJob} */
    const req = {
      ...job,
      deliveryTag: delivery.envelope.deliveryTag,
      replyTo: delivery.properties.replyTo,
      correlationId: delivery.properties.correlationId,
      queue: this.queue,
      args: body.args,
      id: body.id
    }

    if (delivery.properties.replyTo) {
      req.replyTo = delivery.properties.replyTo
      req.correlationId = delivery.properties.correlationId
    }

    this.push(new this.app.jobClass(req, this.channel))

    cb()
  }
}

module.exports = PeanarConsumer
