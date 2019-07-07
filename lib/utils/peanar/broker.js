const { Connection } = require('ts-amqp')

const { PeanarAdapterError } = require('./exceptions')

/**
 * Peanar's broker adapter
 */
class PeanarBroker {
  /**
   * @param {import('./app')} app
   * @param {import('ts-amqp/dist/interfaces/Connection').IConnectionParams=} config 
   */
  constructor(app, config) {
    this.config = config
    this.app = app

    /** @type {import('ts-amqp/dist/classes/Connection').default=} */
    this.conn = undefined

    /** @type {import('ts-amqp/dist/classes/ChannelN').default=} */
    this.channel = undefined

    /** @type {string[]} */
    this.declared_exchanges = [
      '',
      'amq.direct',
      'amq.fanout'
    ]

    /** @type {string[]} */
    this.declared_queues = []
  }

  /**
   * Initializes adapter connection and channel
   */
  async connect() {
    this.app.log('PeanarBroker: connect()')

    const conn = (this.conn = new Connection(this.config))
    await conn.start()

    conn.on('close', () => this.connect())

    this.channel = await conn.channel()

    this.channel.on('channelClose', async () => {
      if (conn.state !== 'closing') this.channel = await conn.channel()
    })

    return this.channel
  }

  /**
   * @param {number} n 
   */
  async prefetch(n) {
    if (!this.channel) throw new PeanarAdapterError('Prefetch: Strange! No open channels found!')

    this.channel.basicQos(n, false)
  }

  async shutdown() {
    this.app.log('PeanarAdapter: shutdown()')

    if (!this.channel) throw new PeanarAdapterError('Shutdown: Strange! No open channels found!')
    if (!this.conn) throw new PeanarAdapterError('Shutdown: Not connected!')

    this.channel.removeAllListeners('channelClose')
    this.conn.removeAllListeners('close')
    await this.conn.close()
  }

  /**
   * @param {string} exchange
   * @param {import('ts-amqp/dist/interfaces/Exchange').EExchangeType} type
   */
  async declareExchange(exchange, type = 'direct') {
    this.app.log(`PeanarBroker: declareExchange('${exchange}')`)

    if (!this.channel) throw new PeanarAdapterError('Not connected!')
    if (this.declared_exchanges.includes(exchange)) return

    await this.channel.declareExchange({
      name: exchange,
      type,
      durable: true,
      arguments: {}
    }, false)
  }

  /**
   * @param {string} queue
   */
  async declareQueue(queue) {
    this.app.log(`PeanarBroker: declareQueue('${queue}')`)

    if (!this.channel) throw new PeanarAdapterError('Not connected!')
    if (this.declared_queues.includes(queue)) return

    await this.channel.declareQueue({
      name: queue,
      durable: true,
      exclusive: false,
      auto_delete: false,
      arguments: {}
    })
  }
}

module.exports = PeanarBroker
