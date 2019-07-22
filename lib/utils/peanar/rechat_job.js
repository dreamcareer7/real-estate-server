const PeanarJob = require('peanar/dist/job').default
const createContext = require('../../../scripts/workers/create-context')
const Metric = require('../../models/Metric')

class RechatJob extends PeanarJob {
  async perform() {
    const defs = this.app.registry.get(this.def.queue)

    let id
    if (defs && defs.size > 1) {
      id = `${this.def.queue}-${this.name}${this.id}`
    }
    else {
      id = `${this.def.queue}-${this.id}`
    }

    const { commit, rollback } = await createContext({ id })

    try {
      const result = await super.perform()
      Metric.increment(`Job.${this.def.queue}`)
      await commit()

      return result
    } catch (ex) {
      rollback(ex)
      throw ex
    }
  }
}

module.exports = RechatJob
