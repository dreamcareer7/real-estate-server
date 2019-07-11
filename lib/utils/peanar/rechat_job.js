const PeanarJob = require('peanar/dist/job').default

const promisify = require('../promisify')
const createContext = require('../../../scripts/workers/create-context')

class RechatJob extends PeanarJob {
  async perform() {
    const id = `this-${this.queue}-${this.name ? this.name + '-' : ''}${this.id ? this.id : ''}`
    const { commit, rollback } = await createContext({ id })

    try {
      const result = await super.perform()
      await commit()

      return result
    } catch (ex) {
      await promisify(rollback)(ex)
      throw ex
    }
  }
}

module.exports = RechatJob
