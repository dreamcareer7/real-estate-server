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
  /* If in 15m, sum of polls count are half or less of half of what it should be, then trigger alert.
  For example, if we poll every 5s and during 15 minutes 90 or less of polls have failed (beause the sum of polls = 180)
  then trigger alert. */
  Metric.monitor({
    name,
    query: `sum(last_15m):Poll.count{${_.toLower(name)}}.as_count() <= ${_.floor((15 * 60) / (wait / 1000) / 2)}`,
    type: 'query alert',
    message: '@slack-9-mls-monitoring',
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
        report_time(['result:success', name])
      } catch (ex) {
        report_time(['result:fail', name])
        Context.error(ex)
        Slack.send({
          channel: '7-server-errors',
          text: `Poller error (${name}): Error while creating context!\n\`${ex}\``
        })
      }
    })

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
