const Context = require('../../models/Context')
const kueue = require('../queue')

const Peanar = require('./app')
const BaseJob = require('./rechat_job')

class RechatPeanar extends Peanar {
  /**
   * @param {import('./peanar').IPeanarOptions=} options
   */
  constructor(options) {
    super({
      logger: Context.log,
      jobClass: BaseJob,
      ...options
    })
  }

  async shutdown() {
    await super.shutdown()

    kueue.shutdown(5 * 60 * 1000, process.exit)
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

    function enqueueJobLater() {
      self.log(`Peanar: job.enqueueJobLater('${job_name}', ${[...arguments]})`)

      Context.get('rabbit_jobs').push({
        def: job_def,
        req: self._prepareJobRequest(job_name, [...arguments])
      })

      return Promise.resolve()
    }

    enqueueJobLater.immediate = async function() {
      return self._enqueueJob(job_def, self._prepareJobRequest(job_name, [...arguments]))
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

    /** @type {{ def: import('./peanar').IPeanarJobDefinition, req: import('./peanar').IPeanarRequest }[]} */
    const jobs = Context.get('rabbit_jobs')

    await Promise.all(jobs.map(({def, req}) => this._enqueueJob(def, req)))
  }
}

const peanar = new RechatPeanar()

if (process.env.NODE_ENV === 'tests') {
  peanar.enqueueContextJobs = async () => {
    peanar.log('Peanar: enqueueContextJobs()')

    if (!Context.get('rabbit_jobs')) {
      console.warn('No rabbit_jobs key found on context!')
      return
    }

    while (Context.get('rabbit_jobs').length > 0) {
      const job = Context.get('rabbit_jobs').shift()

      await job.def.handler.apply(null, job.req.args)
    }
  }

  peanar.job = (fn, def) => {
    const job_name = (def.name && def.name.length) ? def.name : fn.name

    peanar.log(`Peanar: job('${def.queue}', '${job_name}')`)

    const job_def = peanar._registerJob(fn, def)
    const self = peanar

    function enqueueJobLater() {
      self.log(`Peanar: job.enqueueJobLater('${job_name}', ${[...arguments]})`)

      Context.get('rabbit_jobs').push({
        def: { ...job_def, handler: fn },
        req: self._prepareJobRequest(job_name, [...arguments])
      })

      return Promise.resolve()
    }

    enqueueJobLater.immediate = async function() {
      return fn.apply(null, arguments)
    }

    enqueueJobLater.rpc = async function() {}

    return enqueueJobLater
  }
}
module.exports = { peanar }
