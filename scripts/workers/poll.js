const promisify = require('../../lib/utils/promisify')
const createContext = require('./create-context')
const Context = require('../../lib/models/Context')
const Slack = require('../../lib/models/Slack')

const Notification = require('../../lib/models/Notification')
const CrmTaskWorker = require('../../lib/models/CRM/Task/worker/notification')
const CalendarWorker = require('../../lib/models/Calendar/worker/notification')
const EmailCampaign = require('../../lib/models/Email/campaign')
// const ShowingsWorker = require('../../lib/models/Showings/worker')
const GoogleWorker = require('../../lib/models/Google/workers')
const MicrosoftWorker = require('../../lib/models/Microsoft/workers')
const Task = require('../../lib/models/Task')

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

const poll = ({ fn, name }) => {
  async function again() {
    if (shutting_down) return

    poll({
      fn,
      name
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
      console.error(err)

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

    const id = `${name}-${++i}`

    try {
      const ctxRes = await createContext({ id })
      await execute(ctxRes)
    } catch (ex) {
      console.error(ex)
      Slack.send({
        channel: '7-server-errors',
        text: `Poller error (${name}): Error while creating context!\n\`${ex}\``
      })
    } finally {
      if (shutting_down) {
        Context.log('Pollers: shutdown completed')
      } else {
        polling_timeouts.set(name, setTimeout(again, 5000))
      }
    }
  }

  poll_promises.set(name, _poll())
}

const notifications = async () => {
  /*
   * These two need to run in this specific order.
   * Otherwise, we might send email messages before push notifications.
   */
  await Notification.sendForUnread()
  await promisify(Message.sendEmailForUnread)()
}

// poll({
//   fn: notifications,
//   name: 'Notifications'
// })

// poll({
//   fn: CrmTaskWorker.sendNotifications.bind(CrmTaskWorker),
//   name: 'CrmTaskWorker.sendNotifications'
// })

// poll({
//   fn: CalendarWorker.sendEmailForUnread.bind(CalendarWorker),
//   name: 'CalendarWorker.sendEmailForUnread'
// })

// poll({
//   fn: Task.sendNotifications,
//   name: 'Task.sendNotifications'
// })

// poll({
//   fn: EmailCampaign.sendDue,
//   name: 'EmailCampaign.sendDue'
// })

// poll({
//   fn: EmailCampaign.updateStats,
//   name: 'EmailCampaign.updateStats'
// })

// poll({
//   fn: ShowingsWorker.startDue,
//   name: 'ShowingsWorker.crawlerJob'
// })

// poll({
//   fn: GoogleWorker.syncDue,
//   name: 'GoogleWorker.syncDue'
// })

poll({
  fn: MicrosoftWorker.syncDue,
  name: 'MicrosoftWorker.syncDue'
})

module.exports = shutdown
