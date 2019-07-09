const uuid = require('node-uuid')

const { PeanarInternalError } = require('./exceptions')
const Broker = require('./broker')
const Consumer = require('./consumer')
const Worker = require('./worker')

class Peanar {
  /**
   * @param {import('./peanar').IPeanarOptions} options
   */
  constructor(options) {
    this.broker = new Broker(this)

    /** @type {Map<string, Map<string, import('./peanar').IPeanarJobDefinition>>} */
    this.registry = new Map

    this.jobClass = options.jobClass
    this.log = options.logger || (() => {})
  }

  async _ensureConnected() {
    this.log('Peanar: ensureConnected()')

    if (this.broker.channel) return this.broker.channel

    return this.broker.connect()
  }

  async shutdown() {
    this.log('Peanar: shutdown()')

    await this.broker.shutdown()
  }

  /**
   * @param {(...args: any[]) => Promise<any>} fn
   * @param {Omit<import('./peanar').IPeanarJobDefinitionInput, 'handler'>} def
   */
  _registerJob(fn, def) {
    this.log(`Peanar: _registerJob('${def.queue}', ${JSON.stringify(def, null, 2)})`)

    /** @type {import('./peanar').IPeanarJobDefinition} */
    const job_def = {
      routingKey: def.queue,
      exchange: '',
      ...def,
      name: (def.name && def.name.length) ? def.name : fn.name,
      handler: fn
    }

    let queue_mapping = this.registry.get(job_def.queue)

    if (!queue_mapping) {
      queue_mapping = new Map
      this.registry.set(job_def.queue, queue_mapping)
    }

    if (queue_mapping.has(job_def.name)) {
      throw new PeanarInternalError('Job already registered!')
    }

    queue_mapping.set(job_def.name, job_def)

    return job_def
  }

  /**
   * @param {string} name 
   */
  getJobDefinition(queue, name) {
    const queue_mapping = this.registry.get(queue)
    
    if (!queue_mapping) return

    return queue_mapping.get(name)
  }

  /**
   * @param {Omit<import('./peanar').IPeanarJobDefinition, 'handler'>} def
   * @param {import('./peanar').IPeanarRequest} req
   */
  async _enqueueJob(def, req) {
    this.log(`Peanar: _enqueueJob(${JSON.stringify(def, null, 2)}, ${JSON.stringify(req)})`)

    const channel = await this._ensureConnected()
    if (def.exchange) await this.broker.declareExchange(def.exchange)
    await this.broker.declareQueue(def.queue)

    channel.json.write({
      routing_key: def.routingKey,
      properties: {
        correlationId: req.correlationId,
        replyTo: def.replyTo
      },
      body: {
        id: req.id,
        name: req.name,
        args: req.args
      }
    })

    return req.id
  }

  /**
   * @param {string} name 
   * @param {any[]} args 
   * @returns {import('./peanar').IPeanarRequest}
   */
  _prepareJobRequest(name, args) {
    return {
      id: uuid.v4(),
      name,
      args,
    }
  }

  /**
   * @param {(...args: any[]) => Promise<any>} fn
   * @param {import('./peanar').IPeanarJobDefinitionInput} def
   */
  job(fn, def) {
    const job_name = (def.name && def.name.length) ? def.name : fn.name

    this.log(`Peanar: job('${def.queue}', '${job_name}')`)

    const job_def = this._registerJob(fn, def)

    const self = this

    function enqueueJob() {
      self.log(`Peanar: job.enqueueJobLater('${job_name}', ${[...arguments]})`)
      return self._enqueueJob(job_def, self._prepareJobRequest(job_name, [...arguments]))
    }

    enqueueJob.rpc = async function() {

    }

    return enqueueJob
  }

  /**
   * @param {string} queue
   */
  async _startWorker(queue) {
    const channel = await this._ensureConnected()
    const consumer = await channel.basicConsume(queue)

    return consumer
      .pipe(new Consumer(this, channel, queue))
      .pipe(new Worker(this, channel))
  }

  /**
   * @param {{ queues?: string[]; n?: number }} arg0
   */
  async worker({ queues, n = 0 }) {
    await this._ensureConnected()
    await this.broker.prefetch(1)

    const worker_queues = (Array.isArray(queues) && queues.length > 0)
      ? queues
      : [...this.registry.keys()]

    await Promise.all(worker_queues.map(q => this.broker.declareQueue(q)))

    const queues_to_start = worker_queues.flatMap(q => Array(n).fill(q))

    await Promise.all(queues_to_start.map(q => this._startWorker(q)))
  }
}

module.exports = Peanar
