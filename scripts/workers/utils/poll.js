const createContext = require('./create-context')
const Context = require('../../../lib/models/Context')
const Metric = require('../../../lib/models/Metric')
const Slack = require('../../../lib/models/Slack')
const _ = require('lodash')

let i = 1

const poll_promises = new Map()
const polling_timeouts = new Map()
let shutting_down = false

async function shutdown() {
  shutting_down = true

  for (const t of polling_timeouts.values()) {
    clearTimeout(t)
  }

  polling_timeouts.clear()

  await Promise.all(poll_promises.values())
  Context.log('Pollers shutdown successful!')
}

const poll = ({ fn, name, wait = 5000 }) => {
  /* If in 2h, sum of polls count are below or above of what their pattern was in the past hour,
  then trigger alert. */
  Metric.monitor({
    name,
    query: `avg(last_1h):anomalies(avg:Poll.count{${_.toLower(name)}}.as_count(), 'agile', 3, direction='below', interval=600, alert_window='last_2h', seasonality='daily', timezone='utc', count_default_zero='true') >= 1`,
    type: 'query alert',
    message: '@slack-9-operation',
    tags: ['POLLER']
  }).catch(err => {
    Context.error(err)
    Slack.send({
      channel: '7-server-errors',
      text: `Poller error (${name}): Error while creating datadog monitor!\n\`${err}\``
    })
  })

  async function again() {
    if (shutting_down) return

    poll({
      fn,
      name,
      wait
    })
  }

  /**
   * Does not throw an error
   */
  async function execute({ commit, rollback }) {
    try {
      await fn()
      await commit()
    } catch (err) {
      Context.error(err)

      // Error is handled via callback. Doesn't throw.
      Slack.send({
        channel: '7-server-errors',
        text: `Poller error (${name}): '${err}'`,
        emoji: ':skull:'
      })

      // Error is handled inside the function. Doesn't throw.
      rollback(err)
      return
    }
  }

  async function _poll() {
    if (polling_timeouts.has(name)) {
      polling_timeouts.delete(name)
    }

    const id = `process-${process.pid}-${name}-${++i}`

    try {
      const ctxRes = await createContext({ id })

      await ctxRes.run(async () => {
        /** @param {string[]} tags */
        const report_time = (tags) => {
          const time_spent = Number((process.hrtime.bigint() - start) / 1000000n)
          Metric.histogram('Poll', time_spent / 1000, tags)
        }
        const start = process.hrtime.bigint()

        try {
          await execute(ctxRes)
          report_time(['result:success', name, `name:${name}`])
        } catch (ex) {
          report_time(['result:fail', name, `name:${name}`])
          Context.error(ex)
          Slack.send({
            channel: '7-server-errors',
            text: `Poller error (${name}): Error while creating context!\n\`${ex}\``
          })
        }
      })
    } catch(e) {
      Context.log('Failed to run poller. Trying again in', wait, e)
      polling_timeouts.set(name, setTimeout(again, wait))
    }

    if (shutting_down) {
      Context.log('Pollers: shutdown completed')
    } else {
      polling_timeouts.set(name, setTimeout(again, wait))
    }
  }

  poll_promises.set(name, _poll())
}

module.exports = {
  shutdown,
  poll,
}
