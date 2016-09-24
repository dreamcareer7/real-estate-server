const DataDog = require('datadog-metrics')
const config = require('../config.js')

const dd_enabled = !!config.datadog.api_key

let dd
if (dd_enabled) {
  dd = new DataDog.BufferedMetricsLogger({
    apiKey:               config.datadog.api_key,
    flushIntervalSeconds: 10
  })
}

Metric = {}

const metrics = {}

Metric.increment = (name) => {
  if (!metrics[name])
    metrics[name] = 0

  metrics[name]++

  if (dd_enabled)
    dd.increment(name)
}

Metric.set = (name, value) => {
  metrics[name] = value

  if (dd_enabled)
    dd.gauge(name, value)
}

Metric.get = name => metrics[name] || 0

Metric.flush = (cb) => {
  if (dd_enabled) {
    dd.flush()
    setTimeout(cb, 2000) // dd.flush sometimes doesnt fire its callback it seems.
    return
  }

  if (cb)
    cb()
}
