const { v1 } = require('@datadog/datadog-api-client')
const _ = require('lodash')

let _monitor_instance
let _metric_instance

const getMonitorApiInstance = () => {
  if (_monitor_instance)
    return _monitor_instance

  const configuration = v1.createConfiguration()
  _monitor_instance = new v1.MonitorsApi(configuration)
  return _monitor_instance
}

const already = {}

const upsert = async ({ monitor, monitorName, metric, query }) => {
  const instance = getMonitorApiInstance()

  if (already[metric])
    return

  const body = {
    name: monitorName,
    type: 'query alert',
    query,
    message: '@slack-9-mls-monitoring',
    tags: ['POLLER'],
    options: {
      noDataTimeframe: 15,
      notifyNoData: true,
      renotifyInterval: 1
    }
  }

  if (monitor) {
    const is = JSON.parse(JSON.stringify(monitor))
    const shouldBe = _.merge({}, is, body)

    if (_.isEqual(shouldBe, is))
      return

    await instance.updateMonitor({
      monitorId: monitor.id,
      body
    })
    console.log('Updated monitor', monitorName)
  } else {
    const created = await instance.createMonitor({
      body: {
        ...body,
        query: 'avg(last_30m):avg:inactive_jobs{*} > 200'
      }
    })
    await instance.updateMonitor({
      monitorId: created.id,
      body
    })

    console.log('Created monitor', monitorName)
  }

  already[metric] = true
}

const monitor = async ({ name, wait }) => {

  const monitorInstance = getMonitorApiInstance()
  const monitors = _.keyBy(await monitorInstance.listMonitors(), 'name')
  const monitorName = name
  const monitor = monitors[monitorName]
  const metric = _.toLower(name)
  // If in 15m, sum of polls count are half or less of half of what it should be, then trigger alert.
  // For example, if we poll every 5s and during 15 minutes 90 or less of polls have failed (beause the sum of polls = 180)
  // then trigger alert.
  const threshold = _.floor((15 * 60) / (wait / 1000) / 2)
  const query = `sum(last_15m):Poll.count{${metric}}.as_count() <= ${threshold}`
  await upsert({ monitor, monitorName, metric, query })
}

module.exports = {
  monitor
}