const DataDog = require('datadog-metrics')
const config = require('../config.js')

const dd_enabled = Boolean(config.datadog.api_key)

let dd
if (dd_enabled) {
  dd = new DataDog.BufferedMetricsLogger({
    apiKey: config.datadog.api_key,
    flushIntervalSeconds: 10
  })
}

const metrics = {}

const Metric = {
  increment(name) {
    if (!metrics[name])
      metrics[name] = 0

    metrics[name]++

    if (dd_enabled)
      dd.increment(name)
  },
  set(name, value) {
    metrics[name] = value

    if (dd_enabled)
      dd.gauge(name, value)
  },
  get(name) {
    return metrics[name] || 0
  },

  flush(cb) {
    if (dd_enabled) {
      dd.flush()
      setTimeout(cb, 2000) // dd.flush sometimes doesnt fire its callback it seems.
      return
    }

    if (cb)
      return cb()
  }
}

global['Metric'] = Metric
module.exports = Metric