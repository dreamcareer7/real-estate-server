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
      const tags = [`queue:${this.def.queue}`, `name:${this.name}`]

      try {
        const result = await Promise.race([
          super._perform(),
          once(this, 'cancel').then(reason => Promise.reject(reason))
        ])
        await commit()
        report_time([ 'result:success', ...tags])
        return result
      } catch (ex) {
        report_time([ 'result:fail', ...tags ])
        if (ex.slack !== false && (ex.retry === false || (this.max_retries >= 0 && this.attempt === this.max_retries))) {
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
