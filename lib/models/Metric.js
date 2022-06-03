const DataDog = require('datadog-metrics')
const { v1 } = require('@datadog/datadog-api-client')
const _ = require('lodash')
const config = require('../config.js')

const dd_enabled = Boolean(config.datadog.api_key)

/** @type {DataDog.BufferedMetricsLogger} */
let dd
let dd_monitor
if (dd_enabled) {
  dd = new DataDog.BufferedMetricsLogger({
    apiKey: config.datadog.api_key,
    flushIntervalSeconds: 10
  })
  const configuration = v1.createConfiguration()
  dd_monitor = new v1.MonitorsApi(configuration)
}

/** @type {Map<string, number>} */
const metrics = new Map
const monitors = {}

const upsertMonitor = async ({ monitor, name, type, query, message, tags }) => {

  const body = {
    name,
    type,
    query,
    message,
    tags,
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

    await dd_monitor.updateMonitor({
      monitorId: monitor.id,
      body
    })
  } else {
    await dd_monitor.createMonitor({
      body
    })
  }

  monitors[name] = true
}

const Metric = {
  async monitor({ name, type, query, message, tags }) {
    if (dd_enabled && !monitors[name]) {
      const [monitor] = await dd_monitor.listMonitors({ name })
      await upsertMonitor({ monitor, name, type, query, message, tags })
    }

  },
  increment(name, tags = []) {
    if (dd_enabled)
      dd.increment(name, 1, tags)
  },
  histogram(name, value, tags = []) {
    if (dd_enabled) {
      dd.histogram(name, value, tags)
    }
  },
  set(name, value) {
    metrics.set(name, value)

    if (dd_enabled)
      dd.gauge(name, value)
  },
  get(name) {
    return metrics.get(name) || 0
  },

  flush(cb) {
    if (dd_enabled) {
      dd.flush()
      setTimeout(cb, 2000) // dd.flush sometimes doesnt fire its callback it seems.
      return
    }

    if (cb)
      return cb()
  },

  reset() {
    metrics.clear()
  }
}

module.exports = Metric
