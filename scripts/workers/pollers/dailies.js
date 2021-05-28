const Daily = require('../../../lib/models/Daily')
const { poll } = require('../utils/poll')

function start() {
  /*
  * We have a 15 minute wait here. Why?
  * This query runs. It queues thousands of daily_email jobs.
  * Ideally, those daily_email jobs should run very quickly. A few seconds each.
  * But if there's something wrong those jobs may take longer to execute.
  *
  * Now, those jobs, once they execute, are responsible for saving a daily entry.
  * If a daily entry is not saved, the due query will pick it up again.
  *
  * So, if the workers are not running (and running fast) this poller will
  * keep getting executed. Again and again.
  *
  * Every time it executes, it'll add thousands of repetetive jobs to queue.
  */

  poll({
    fn: Daily.sendDue,
    name: 'Daily.sendDue',
    wait: 1000 * 60 * 15
  })
}

module.exports = {
  start,
  shutdown: require('../utils/poll').shutdown
}
