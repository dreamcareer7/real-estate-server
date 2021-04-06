const debug = require('debug')('peanar:app')
const url = require('url')
const config = require('../../config')

const Context = require('../../models/Context')

const Peanar = require('peanar')

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
  if (parsed.path && parsed.path.length > 1) params.vhost = parsed.path.replace(/^\//, '')
  if (parsed.auth) {
    const [username, password] = parsed.auth.split(':', 2)
    params.username = username
    params.password = password
  }

  return params
}

class RechatPeanar extends Peanar {
  async shutdown() {
    await super.shutdown()

    Context.log('PeanarApp#shutdown: successfully closed.')
  }

  constructor(options) {
    const connectionParams = typeof config.amqp.connection === 'string'
      ? parseAmqpUrl(config.amqp.connection)
      : config.amqp.connection

    super({
      // logger: () => {},
      logger: Context.log,
      jobClass: require('./rechat_job'),
      connection: connectionParams,
      ...options
    })
  }

  /**
   * @param {import('peanar/dist/app').IPeanarJobDefinition} def
   */
  // @ts-ignore
  _createEnqueuer(def) {
    const self = this

    function enqueueJob() {
      debug(`Peanar: job.enqueueJob('${def.name}', ${[...arguments]})`)

      Context.get('rabbit_jobs').push({
        def,
        req: self._prepareJobRequest(def.name, [...arguments])
      })

      return Promise.resolve()
    }

    /**
     * @param {unknown[]} args
     */
    enqueueJob.immediate = (...args) => {
      debug(`Peanar: job.enqueueJob('${def.name}')`)
      return self.enqueueJobRequest(def, self._prepareJobRequest(def.name, args))
    }
    enqueueJob.rpc = async (...args) => { }
    return enqueueJob
  }

  async enqueueContextJobs() {
    debug('Peanar: enqueueContextJobs()')

    if (!Context.get('rabbit_jobs')) {
      console.warn('No rabbit_jobs key found on context!')
      return
    }

    /** @type {{ def: import('peanar/dist/app').IPeanarJobDefinition, req: import('peanar/dist/app').IPeanarRequest }[]} */
    const jobs = Context.get('rabbit_jobs')

    if (jobs.length > 0) {
      Context.log(`Enqueuing ${jobs.length} Peanar jobs...`)
    }

    for (const { def, req } of jobs) {
      await this.enqueueJobRequest(def, req)
    }
  }
}

module.exports = RechatPeanar
