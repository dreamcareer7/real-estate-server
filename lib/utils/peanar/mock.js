const debug = require('debug')('peanar:app')
const Context = require('../../models/Context')
const RechatPeanar = require('./app')

class MockPeanar extends RechatPeanar {
  constructor(options) {
    super({
      logger: Context.log,
      connection: {},
      ...options
    })

    this.enqueuers = new Map()
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

    enqueueJob.delayed = enqueueJob

    /**
     * @param {unknown[]} args
     */
    enqueueJob.immediate = async (...args) => {
      debug(`Peanar: job.enqueueJob('${def.name}')`)

      const req = self._prepareJobRequest(def.name, args)
      // eslint-disable-next-line no-useless-call
      await def.handler.apply(null, args)

      return req.id
    }
    enqueueJob.rpc = async (...args) => { }
    enqueueJob.transaction = this._createTransactor(def)

    this.enqueuers.set(def.name, enqueueJob)

    return enqueueJob
  }

  async enqueueContextJobs() {
    this.log('Peanar: enqueueContextJobs()')

    if (!Context.get('rabbit_jobs')) {
      console.warn('No rabbit_jobs key found on context!')
      return
    }

    while (Context.get('rabbit_jobs').length > 0) {
      const job = Context.get('rabbit_jobs').shift()

      Context.log('Handling job', job.req.name)
      await job.def.handler.apply(null, job.req.args)
    }
  }
}

module.exports = MockPeanar
