const Context = require('../../lib/models/Context')
require('../../lib/models/MLS/workers')
require('../../lib/models/CRM/Task/worker')
require('../../lib/models/CRM/Touch/worker')
require('../../lib/models/Trigger/worker')

const queues = Object.assign(
  require('../../scripts/workers/kue/queues.js'),
  require('./queues.js')
)
const { peanar } = require('../../lib/utils/peanar')

function handleJob(queue, name, data, cb) {
  if (queues[queue]) {
    return handleKueJob(queue, data, cb)
  }

  return handlePeanarJob({
    id: '1',
    attempt: 1,
    deliveryTag: BigInt(1),
    name,
    args: [data]
  }).nodeify(cb)
}

function handleKueJob(name, data, cb) {
  Context.log('Handling job', name)
  queues[name].handler({type: name, data}, cb)
}

/**
 * @param {import('peanar/dist/app').IPeanarRequest} req 
 */
async function handlePeanarJob(req) {
  const def = peanar.registry.getJobDefinition(req.name)
  
  if (!def) throw new Error(`handlePeanarJobs: No handler found for job ${req.name}`)
  Context.log('Handling job', req.name)

  await def.handler.apply(null, req.args)
}

function installJobsRoute(app) {
  app.post('/jobs', (req, res) => {
    const queue = req.body.queue || req.body.name
    const name = req.body.name
    const data = req.body.data

    handleJob(queue, name, data, (err, result) => {
      if (err) {
        console.log(err)
        return res.json(err)
      }
      res.json(result)
    })
  })
}

module.exports = {
  handleJob,
  handlePeanarJob,
  installJobsRoute
}
