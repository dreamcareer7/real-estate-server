const createContext = require('./create-context')
const Context = require('../../../lib/models/Context')
const Slack = require('../../../lib/models/Slack')

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
      try {
        await execute(ctxRes)
      } catch (ex) {
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
