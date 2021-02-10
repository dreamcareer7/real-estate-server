const PeanarJob = require('peanar/dist/job').default
const createContext = require('../../../scripts/workers/utils/create-context')
const Metric = require('../../models/Metric')
const Slack = require('../../models/Slack')

const { once } = require('events')

class RechatJob extends PeanarJob {
  async _perform() {
    const id = `process-${process.pid}-${this.def.name}-${this.id}`
    let ctxRes

    try {
      ctxRes = await createContext({ id })
    } catch (ex) {
      console.error(ex)
      Slack.send({
        channel: '7-server-errors',
        text: `Worker error (${this.def.name}): Error while creating context!\n\`${ex}\``
      })

      throw ex
    }

    const { commit, rollback, run } = ctxRes

    return run(async () => {
      try {
        const result = await Promise.race([super._perform(), once(this, 'cancel').then(reason => Promise.reject(reason))])
        Metric.increment(`Job.${this.def.queue}`)
        await commit()

        return result
      } catch (ex) {
        Slack.send({
          channel: '7-server-errors',
          text: `Worker error (${this.def.name}): \`${ex}\``,
          emoji: ':skull:'
        })

        rollback(ex)
        throw ex
      }
    })
  }
}

module.exports = RechatJob
