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
   * @param {import('./peanar').IPeanarJobDefinitionInput} params
   */
  job(fn, params) {
    const job_name = (params.name && params.name.length) ? params.name : fn.name

    this.log(`Peanar: job('${params.queue}', '${job_name}')`)

    this._registerJob(fn, {
      ...params,
      routingKey: params.queue,
      name: job_name
    })

    const self = this

    function enqueueJobLater() {
      self.log(`Peanar: job.enqueueJobLater('${job_name}', ${[...arguments]})`)

      Context.get('rabbit_jobs').push({
        queue: params.queue,
        job: self._prepareJobRequest(job_name, [...arguments])
      })

      return Promise.resolve()
    }

    enqueueJobLater.immediate = async function() {
      return self._enqueueJob(params.queue, self._prepareJobRequest(job_name, [...arguments]))
    }

    enqueueJobLater.rpc = async function() {

    }

    return enqueueJobLater
  }

  async enqueueContextJobs() {
    this.log('Peanar: enqueueContextJobs()')

    if (!Context.get('rabbit_jobs')) {
      console.warn('No rabbit_jobs key found on context!')
      return
    }

    const jobs = Context.get('rabbit_jobs')

    await Promise.all(jobs.map(({queue, job}) => this._enqueueJob(queue, job)))
  }
}

const peanar = new RechatPeanar()

// if (process.env.NODE_ENV === 'tests') {
//   const queues = require('../../../scripts/queues.js')

//   /**
//    * @param {(...args: any[]) => Promise<any>} fn
//    */
//   peanar.job = (fn) => {
//     fn.immediate = fn
//     fn.rpc = fn

//     return fn
//   }
// }

module.exports = { peanar }
