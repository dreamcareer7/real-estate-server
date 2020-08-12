const promisify = require('../../lib/utils/promisify')
const createContext = require('./create-context')
const Context = require('../../lib/models/Context')
const Slack = require('../../lib/models/Slack')
const Message = require('../../lib/models/Message/email')

const Notification = require('../../lib/models/Notification')
const CrmTaskWorker = require('../../lib/models/CRM/Task/worker/notification')
const CalendarWorker = require('../../lib/models/Calendar/worker/notification')
const EmailCampaign = require('../../lib/models/Email/campaign')
const EmailCampaignStats = require('../../lib/models/Email/campaign/stats')
const GoogleWorkers = require('../../lib/models/Google/workers')
const MicrosoftWorker = require('../../lib/models/Microsoft/workers')
const Task = require('../../lib/models/Task')
const BrandTemplate = require('../../lib/models/Template/brand')
const Daily = require('../../lib/models/Daily')
// const ShowingsWorker = require('../../lib/models/Showings/worker')

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

const notifications = async () => {
  /*
   * These two need to run in this specific order.
   * Otherwise, we might send email messages before push notifications.
   */
  await Notification.sendForUnread()
  await promisify(Message.sendEmailForUnread)()
}

poll({
  fn: notifications,
  name: 'Notifications'
})

poll({
  fn: CrmTaskWorker.sendNotifications.bind(CrmTaskWorker),
  name: 'CrmTaskWorker.sendNotifications'
})

poll({
  fn: CalendarWorker.sendEmailForUnread.bind(CalendarWorker),
  name: 'CalendarWorker.sendEmailForUnread'
})

poll({
  fn: Task.sendNotifications,
  name: 'Task.sendNotifications'
})

poll({
  fn: EmailCampaign.sendDue,
  name: 'EmailCampaign.sendDue'
})

poll({
  fn: EmailCampaignStats.updateStats,
  name: 'EmailCampaignStats.updateStats'
})

poll({
  fn: GoogleWorkers.Gmail.syncDue,
  name: 'GoogleWorkers.gmail.syncDue',
  wait: 60000
})

poll({
  fn: GoogleWorkers.Calendar.syncDue,
  name: 'GoogleWorkers.calendar.syncDue',
  wait: 60000
})

poll({
  fn: GoogleWorkers.Contacts.syncDue,
  name: 'GoogleWorkers.contacts.syncDue',
  wait: 60000
})

poll({
  fn: MicrosoftWorker.Outlook.syncDue,
  name: 'MicrosoftWorker.outlook.syncDue',
  wait: 60000
})

poll({
  fn: MicrosoftWorker.Calendar.syncDue,
  name: 'MicrosoftWorker.calendar.syncDue',
  wait: 60000
})

poll({
  fn: MicrosoftWorker.Contacts.syncDue,
  name: 'MicrosoftWorker.contacts.syncDue',
  wait: 60000
})

poll({
  fn: MicrosoftWorker.Outlook.parseNotifications,
  name: 'MicrosoftWorker.Outlook.parseNotifications',
  wait: 5000
})

poll({
  fn: BrandTemplate.updateThumbnails,
  name: 'BrandTemplate.updateThumbnails'
})

poll({
  fn: Daily.sendDue,
  name: 'Daily.sendDue'
})

// poll({
//   fn: ShowingsWorker.startDue,
//   name: 'ShowingsWorker.crawlerJob'
// })

module.exports = shutdown
