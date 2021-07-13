const DataDog = require('datadog-metrics')
const config = require('../config.js')

const dd_enabled = Boolean(config.datadog.api_key)

/** @type {DataDog.BufferedMetricsLogger} */
let dd
if (dd_enabled) {
  dd = new DataDog.BufferedMetricsLogger({
    apiKey: config.datadog.api_key,
    flushIntervalSeconds: 10
  })
}

/** @type {Map<string, number>} */
const metrics = new Map

const Metric = {
  increment(name, tags = []) {
    const current = metrics.get(name)

    if (!current)
      metrics.set(name, 1)
    else
      metrics.set(name, current + 1)

    if (dd_enabled)
      dd.increment(name, 1, tags)
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
