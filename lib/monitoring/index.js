const { v1, v2 } = require('@datadog/datadog-api-client')
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

const getMetricApiInstance = () => {
  if (_metric_instance)
    return _metric_instance

  const configuration = v2.createConfiguration()
  _metric_instance = new v2.MetricsApi(configuration)
  return _metric_instance
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
    tags: ['pollers'],
    options: {
      noDataTimeframe: 360,
      notifyNoData: true,
      renotifyInterval: 90
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
    try {
      const created = await instance.createMonitor({
        body: {
          ...body,
          query: `avg(last_30m):avg:inactive_jobs{*} > 200`
        }
      })
      await instance.updateMonitor({
        monitorId: created.id,
        body
      })

    } catch (error) {
      console.log(error)

    }

    console.log('Created monitor', monitorName)
  }

  already[metric] = true
}

const run = async () => {

  const metricInstance = getMetricApiInstance()
  const tags = _.get(await metricInstance.listTagsByMetricName({ 'metricName': 'Poll.count' }), 'data.attributes.tags')

  const monitorInstance = getMonitorApiInstance()
  const monitors = _.keyBy(await monitorInstance.listMonitors(), 'name')

  tags.forEach(async tag => {
    const monitorName = _.capitalize(tag);
    const monitor = monitors[monitorName]
    const metric = `Poll.count{${tag}}`
    const query = `avg(last_12h):anomalies(avg:${metric}.as_count(), 'agile', 2, direction='below', alert_window='last_4h', interval=120, count_default_zero='true', seasonality='monthly') >= 1`
    await upsert({ monitor, monitorName, metric, query })
  })
}


run()
  .then(process.exit)
  .catch(e => {
    console.log(e)
    process.exit()
  })
