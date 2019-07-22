const Context = require('../../lib/models/Context')
require('../../lib/models/MLS/workers')

const queues = Object.assign(
  require('../../scripts/workers/queues.js'),
  require('./queues.js')
)
const { peanar } = require('../../lib/utils/peanar')

function handleJob(queue, name, data, cb) {
  if (queues[queue]) {
    return handleKueJob(queue, data, cb)
  }

  return handlePeanarJob(queue, {
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
 * @param {string} queue 
 * @param {import('peanar/dist/app').IPeanarRequest} req 
 */
async function handlePeanarJob(queue, req) {
  const fn = peanar.getJobDefinition(queue, req.name)

  if (!fn) throw new Error(`handlePeanarJobs: No handler found for job ${queue}:${req.name}`)

  await fn.handler.apply(null, req.args)
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
