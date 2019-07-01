const { Transform } = require('stream')
const { Connection } = require('ts-amqp')
const queue = require('./queue')

const db = require('./db')
const promisify = require('./promisify')

const Context = require('../models/Context')
const Job = require('../models/Job')

class Peanar {
  constructor() {
    /** @type {import('ts-amqp/dist/classes/Connection').default=} */
    this.conn = undefined

    /** @type {import('ts-amqp/dist/classes/ChannelN').default=} */
    this.channel = undefined

    /** @type {Record<string, Record<string, (...args: any[]) => any>>} */
    this.queue_job_mapping = {}

    /** @type {string[]} */
    this._declared_queues = []
  }

  async shutdown() {
    Context.log('Peanar: shutdown()')

    if (!this.channel) throw new Error('Shutdown: Strange! No open channels found!')
    if (!this.conn) throw new Error('Shutdown: Not connected!')

    this.channel.removeAllListeners('channelClose')
    this.conn.removeAllListeners('close')
    await this.conn.close()

    queue.shutdown(5 * 60 * 1000, process.exit)
  }

  /**
   * @param {(...args: any[]) => any} fn
   * @param {string} queue
   * @param {string} name
   */
  _registerJob(fn, queue, name) {
    Context.log(`Peanar: _registerJob('${queue}', '${name}')`)

    if (!this.queue_job_mapping[queue]) {
      this.queue_job_mapping[queue] = {}
    }

    if (this.queue_job_mapping[queue][name]) {
      throw new Error('Job already registered!')
    }

    this.queue_job_mapping[queue][name] = fn
  }

  async _connect() {
    Context.log('Peanar: connect()')

    const conn = (this.conn = new Connection())
    await conn.start()

    conn.on('close', () => this._connect())

    this.channel = await conn.channel()

    this.channel.on('channelClose', async () => {
      if (conn.state !== 'closing') this.channel = await conn.channel()
    })

    return this.channel
  }

  /**
   * @param {string} queue
   */
  async _ensureQueue(queue) {
    Context.log(`Peanar: _ensureQueue('${queue}')`)

    if (!this.channel) throw new Error('Not connected!')
    if (this._declared_queues.includes(queue)) return

    await this.channel.declareQueue({
      name: queue,
      durable: true,
      exclusive: false,
      auto_delete: false,
      arguments: {}
    })
  }

  async _ensureConnected() {
    Context.log('Peanar: _ensureConnected()')

    if (this.channel) return this.channel

    return this._connect()
  }

  async _enqueueJob(queue, job) {
    Context.log(`Peanar: _enqueueJob('${queue}', ${JSON.stringify(job)})`)

    const channel = await this._ensureConnected()

    await this._ensureQueue(queue)

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

    if (!name || name === '') name = fn.name

    this._registerJob(fn, queue, name)

    const self = this

    function enqueueJobLater() {
      Context.log(`Peanar: job.enqueueJobLater('${name}', ${[...arguments]})`)

      Context.get('rabbit_jobs').push({
        queue,
        job: {
          name,
          args: [...arguments]
        }
      })
    }

    enqueueJobLater.immediate = async function() {
      return self._enqueueJob(queue, {
        name,
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
   * @param {import('ts-amqp/dist/interfaces/Basic').IDelivery} delivery
   */
  _readMessage(delivery) {
    Context.log(`Peanar: _readMessage(${JSON.stringify(delivery.body.toString('utf-8'), null, 2)})`)

    if (!delivery.body) throw new Error('Delivery without body!')

    const body = JSON.parse(delivery.body.toString('utf-8'))

    return {
      name: body.name,
      args: body.args
    }
  }

  _prepareContext(c, cb) {
    const context = Context.create({
      ...c
    })

    context.enter()

    db.conn(function(err, conn, done) {
      if (err) return cb(Error.Database(err))

      const rollback = function(err) {
        Context.trace('<- Rolling back on worker'.red, err)

        conn.query('ROLLBACK', done)
      }

      const commit = cb => {
        conn.query('COMMIT', function(err) {
          if (err) {
            Context.trace('<- Commit failed!'.red)
            return rollback(err)
          }

          Context.log('Committed 👌')

          done()
          const jobs = context.get('jobs')
          Job.handle(jobs, cb)
        })
      }

      conn.query('BEGIN', function(err) {
        if (err) return cb(Error.Database(err))

        context.set({
          db: conn,
          jobs: []
        })

        context.run(() => {
          cb(null, { rollback, commit })
        })
      })

      context.on('error', function(e) {
        delete e.domain
        delete e.domainThrown
        delete e.domainEmitter
        delete e.domainBound

        Context.log('⚠ Panic:'.yellow, e, e.stack)
        rollback(e.message)
      })
    })
  }

  /**
   * @param {string} queue
   * @param {{ id?: string; name: string; args: any[] }} job
   */
  async _runJob(queue, job) {
    Context.log(`Peanar: _runJob('${queue}', ${JSON.stringify(job, null, 2)}))`)

    const id = `job-${queue}-${job.name ? job.name + '-' : ''}${job.id ? job.id : ''}`
    const { commit, rollback } = await promisify(this._prepareContext)({ id })

    try {
      const result = await this.queue_job_mapping[queue][job.name].apply(null, job.args)
      await promisify(commit)()

      return result
    } catch (ex) {
      await promisify(rollback)(ex)
      throw ex
    }
  }

  /**
   * @param {string} queue
   */
  async worker(queue) {
    const self = this
    const channel = await this._ensureConnected()
    await this._ensureQueue(queue)

    const consumer = await channel.basicConsume(queue)

    consumer.pipe(
      new Transform({
        objectMode: true,

        /**
         * @param {import('ts-amqp/dist/interfaces/Basic').IDelivery} chunk
         * @param {string} _encoding
         * @param {import('stream').TransformCallback} cb
         */
        async transform(chunk, _encoding, cb) {
          const job = self._readMessage(chunk)

          if (typeof self.queue_job_mapping[queue][job.name] !== 'function') {
            return cb(new Error('Job name not registered!'))
          }
          if (!Array.isArray(job.args)) {
            return cb(new Error('Job args is not an array!'))
          }

          try {
            const result = await self._runJob(queue, job)

            this.push({
              status: 'SUCCESS',
              result
            })
          } catch (ex) {
            console.error(ex)
            this.push({
              status: 'FAILURE',
              ex
            })
          } finally {
            // eslint-disable-next-line callback-return
            cb()
          }
        }
      })
    )

    return consumer
  }
}

const peanar = new Peanar()

if (process.env.NODE_ENV === 'tests') {
  const queues = require('../../scripts/queues.js')

  /**
   * @param {(...args: any[]) => Promise<any>} fn
   */
  peanar.job = (fn) => {
    fn.immediate = fn

    return fn
  }
}

module.exports = { peanar }
