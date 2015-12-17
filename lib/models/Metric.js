var DataDog = require('datadog-metrics');
var config = require('../config.js');

var dd_enabled = !!config.datadogs.api_key;

if(dd_enabled)
  var dd = new DataDog.BufferedMetricsLogger({
      apiKey: config.datadogs.api_key,
  });

Metric = {};

var metrics = {};
Metric.increment = (name) => {
  if(!metrics[name])
    metrics[name] = 0;

  metrics[name]++;

  if(dd_enabled)
    dd.increment('mls.'+name);
}

Metric.get = name => metrics[name] || 0;

Metric.flush = () => {
  if(dd_enabled)
    dd.flush();
}