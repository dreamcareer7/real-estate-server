const { Transform } = require('stream')

const Context = require('../../models/Context')

const PeanarJob = require('./job')

class PeanarConsumer extends Transform {
  /**
   * @param {import('./app')} app 
   * @param {string} queue
   */
  constructor(app, queue) {
    super({
      objectMode: true
    })

    this.app = app
    this.queue = queue
  }

  /**
   * @param {string} name 
   */
  getHandler(name) {
    const queue_mapping = this.app.registry.get(this.queue)
    
    if (!queue_mapping) return

    return queue_mapping.get(name)
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

    Context.log(`PeanarConsumer: _transform(${JSON.stringify(delivery.body.toString('utf-8'), null, 2)})`)

    const body = JSON.parse(delivery.body.toString('utf-8'))

    if (!body.name || body.name.length < 1) {
      console.warn('PeanarConsumer#_transform: Invalid message body!')
      return cb()
    }

    const handler = this.getHandler(body.name)

    if (!handler) {
      console.warn(`PeanarConsumer#_transform: No handler registered for ${this.queue}.${body.name}!`)
      return cb()
    }

    this.push(new PeanarJob(body.name, body.args, this.queue, handler))

    cb()
  }
}

module.exports = PeanarConsumer
