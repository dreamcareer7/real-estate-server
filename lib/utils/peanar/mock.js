const Context = require('../../models/Context')
const RechatPeanar = require('./app')

class MockPeanar extends RechatPeanar {
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
        def: { ...job_def, handler: fn },
        req: self._prepareJobRequest(job_name, [...arguments])
      })

      return Promise.resolve()
    }

    enqueueJobLater.immediate = async function() {
      // eslint-disable-next-line no-useless-call
      return fn.apply(null, [...arguments])
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

    while (Context.get('rabbit_jobs').length > 0) {
      const job = Context.get('rabbit_jobs').shift()

      await job.def.handler.apply(null, job.req.args)
    }
  }
}

module.exports = MockPeanar
