const PeanarJob = require('peanar/dist/job').default
const createContext = require('../../../scripts/workers/create-context')

class RechatJob extends PeanarJob {
  async perform() {
    const id = `this-${this.def.queue}-${this.name ? this.name + '-' : ''}${this.id ? this.id : ''}`
    const { commit, rollback } = await createContext({ id })

    try {
      const result = await super.perform()
      await commit()

      return result
    } catch (ex) {
      rollback(ex)
      throw ex
    }
  }
}

module.exports = RechatJob
