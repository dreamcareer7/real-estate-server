const PeanarJob = require('peanar/dist/job').default
const createContext = require('../../../scripts/workers/create-context')
const Metric = require('../../models/Metric')
const Slack = require('../../models/Slack')

const { once } = require('events')

class RechatJob extends PeanarJob {
  async _perform() {
    const id = `${this.def.name}-${this.id}`

    const { commit, rollback } = await createContext({ id })

    try {
      const result = await Promise.race([
        super._perform(),
        once(this, 'cancel').then((reason) => Promise.reject(reason))
      ])
      Metric.increment(`Job.${this.def.queue}`)
      await commit()

      return result
    } catch (ex) {
      Slack.send({
        channel: '7-server-errors',
        text: `Peanar worker error: \`${ex}\``,
        emoji: ':skull:'
      })
    
      rollback(ex)
      throw ex
    }
  }
}

module.exports = RechatJob
