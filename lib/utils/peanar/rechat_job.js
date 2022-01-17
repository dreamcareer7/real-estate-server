const PeanarJob = require('peanar/dist/job').default
const Metric = require('../../models/Metric')
const Slack = require('../../models/Slack')

const { once } = require('events')

class RechatJob extends PeanarJob {
  async _perform() {
    if (this.def.context === false)
      return super._perform()

    const id = `process-${process.pid}-${this.def.name}-${this.id}`
    let ctxRes

    const createContext = require('../../../scripts/workers/utils/create-context')
    
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
      /** @param {string[]} tags */
      const report_time = (tags) => {
        const time_spent = Number((process.hrtime.bigint() - start) / 1000000n)
        Metric.histogram('Job', time_spent / 1000, tags)
      }
      const start = process.hrtime.bigint()

      try {
        const result = await Promise.race([
          super._perform(),
          once(this, 'cancel').then(reason => Promise.reject(reason))
        ])
        Metric.increment('Job', [this.def.queue])
        await commit()
        report_time([ 'result:success', this.def.queue, this.name])
        return result
      } catch (ex) {
        report_time([ 'result:fail' ])
        if (ex.slack !== false) {
          Slack.send({
            channel: '7-server-errors',
            text: `Worker error (${this.def.name}): \`${ex}\``,
            emoji: ':skull:'
          })
        }

        rollback(ex)
        throw ex
      }
    })
  }
}

module.exports = RechatJob
