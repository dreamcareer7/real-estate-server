const url = require('url')
const config = require('../../config')

const Context = require('../../models/Context')
const kueue = require('../queue')

const Peanar = require('peanar')
const BaseJob = require('./rechat_job')

/**
 * @param {string} amqp 
 * @returns {Partial<import('ts-amqp/dist/interfaces/Connection').IConnectionParams>}
 */
function parseAmqpUrl(amqp) {
  const parsed = url.parse(amqp)

  /** @type {Partial<import('ts-amqp/dist/interfaces/Connection').IConnectionParams>} */
  const params = {}

  if (parsed.hostname) params.host = parsed.hostname
  if (parsed.port) params.port = parseInt(parsed.port)
  if (parsed.path) params.vhost = parsed.path.replace(/^\//, '')
  if (parsed.auth) {
    const [username, password] = parsed.auth.split(':', 2)
    params.username = username
    params.password = password
  }

  return params
}

class RechatPeanar extends Peanar {
  constructor(options) {
    const connectionParams = typeof config.amqp.connection === 'string'
      ? parseAmqpUrl(config.amqp.connection)
      : config.amqp.connection

    super({
      // logger: () => {},
      logger: Context.log,
      jobClass: BaseJob,
      connection: connectionParams,
      ...options
    })
  }

  async shutdown() {
    await super.shutdown()

    kueue.shutdown(5 * 60 * 1000, process.exit)
  }

  /**
   * @param {(...args: any[]) => Promise<any>} fn
   * @param {import('peanar/dist/app').IPeanarJobDefinitionInput} def
   */
  job(fn, def) {
    const job_name = (def.name && def.name.length) ? def.name : fn.name

    this.log(`Peanar: job('${def.queue}', '${job_name}')`)

    const job_def = this._registerJob(fn, def)
    const self = this

    function enqueueJobLater() {
      self.log(`Peanar: job.enqueueJobLater('${job_name}', ${[...arguments]})`)

      Context.get('rabbit_jobs').push({
        def: job_def,
        req: self._prepareJobRequest(job_name, [...arguments])
      })

      return Promise.resolve()
    }

    enqueueJobLater.immediate = async function() {
      return self.enqueueJob(job_def, self._prepareJobRequest(job_name, [...arguments]))
    }

    enqueueJobLater.rpc = async function() {}

    return enqueueJobLater
  }

  async enqueueContextJobs() {
    this.log('Peanar: enqueueContextJobs()')

    if (!Context.get('rabbit_jobs')) {
      console.warn('No rabbit_jobs key found on context!')
      return
    }

    /** @type {{ def: import('peanar/dist/app').IPeanarJobDefinition, req: import('peanar/dist/app').IPeanarRequest }[]} */
    const jobs = Context.get('rabbit_jobs')

    await Promise.all(jobs.map(({def, req}) => this.enqueueJob(def, req)))
  }
}

module.exports = RechatPeanar
