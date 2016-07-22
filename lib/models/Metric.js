var DataDog = require('datadog-metrics');
var config = require('../config.js');

var dd_enabled = !!config.datadog.api_key;

if(dd_enabled)
  var dd = new DataDog.BufferedMetricsLogger({
      apiKey: config.datadog.api_key,
      flushIntervalSeconds:10
  });

Metric = {};

var metrics = {};

Metric.increment = (name) => {
  if(!metrics[name])
    metrics[name] = 0;

  metrics[name]++;

  if(dd_enabled)
    dd.increment(name);
};

Metric.set = (name, value) => {
  metrics[name] = value;

  if(dd_enabled)
    dd.gauge(name, value);
}

Metric.get = name => metrics[name] || 0;

Metric.flush = () => {
  if(dd_enabled)
    dd.flush();
};
