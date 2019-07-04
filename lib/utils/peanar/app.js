const queue = require('../queue')

const Context = require('../../models/Context')

const { PeanarInternalError } = require('./exceptions')
const Broker = require('./broker')
const Consumer = require('./consumer')
const Worker = require('./worker')

/**
 * @typedef IPeanarJob
 * @prop {string=} id
 * @prop {string} name
 * @prop {any[]} args
 */

class Peanar {
  constructor() {
    this.broker = new Broker()

    /** @type {Map<string, Map<string, (...args: any[]) => any>>} */
    this.registry = new Map
  }

  async _ensureConnected() {
    Context.log('Peanar: ensureConnected()')

    if (this.broker.channel) return this.broker.channel

    return this.broker.connect()
  }

  async shutdown() {
    Context.log('Peanar: shutdown()')

    await this.broker.shutdown()

    queue.shutdown(5 * 60 * 1000, process.exit)
  }

  /**
   * @param {(...args: any[]) => any} fn
   * @param {string} queue
   * @param {string} name
   */
  _registerJob(fn, queue, name) {
    Context.log(`Peanar: _registerJob('${queue}', '${name}')`)

    let queue_mapping = this.registry.get(queue)

    if (!queue_mapping) {
      queue_mapping = new Map
      this.registry.set(queue, queue_mapping)
    }

    if (queue_mapping.has(name)) {
      throw new PeanarInternalError('Job already registered!')
    }

    queue_mapping.set(name, fn)
  }

  /**
   * 
   * @param {string} queue 
   * @param {IPeanarJob} job 
   */
  async _enqueueJob(queue, job) {
    Context.log(`Peanar: _enqueueJob('${queue}', ${JSON.stringify(job)})`)

    const channel = await this._ensureConnected()
    await this.broker.declareQueue(queue)

    channel.json.write({
      routing_key: queue,
      body: job
    })
  }

  /**
   * @param {(...args: any[]) => Promise<any>} fn
   * @param {string} queue
   * @param {string?} name
   */
  job(fn, queue, name = '') {
    Context.log(`Peanar: job('${queue}', '${name}')`)

    const job_name = (name && name.length) ? name : fn.name

    this._registerJob(fn, queue, job_name)

    const self = this

    function enqueueJobLater() {
      Context.log(`Peanar: job.enqueueJobLater('${job_name}', ${[...arguments]})`)

      Context.get('rabbit_jobs').push({
        queue,
        job: {
          name: job_name,
          args: [...arguments]
        }
      })
    }

    enqueueJobLater.immediate = async function() {
      return self._enqueueJob(queue, {
        name: job_name,
        args: [...arguments]
      })
    }

    return enqueueJobLater
  }

  async enqueueContextJobs() {
    Context.log('Peanar: enqueueContextJobs()')

    if (!Context.get('rabbit_jobs')) {
      console.warn('No rabbit_jobs key found on context!')
      return
    }

    const jobs = Context.get('rabbit_jobs')

    await Promise.all(jobs.map(({queue, job}) => this._enqueueJob(queue, job)))
  }

  /**
   * @param {string} queue
   */
  async worker(queue) {
    const channel = await this._ensureConnected()
    await this.broker.declareQueue(queue)

    const consumer = await channel.basicConsume(queue)

    return consumer
      .pipe(new Consumer(this, queue))
      .pipe(new Worker(this))
  }
}

module.exports = Peanar
