const Context = require('../../lib/models/Context')
const queues = Object.assign(
  require('../../scripts/queues.js'),
  require('./queues.js')
)

function handleJob(name, data, cb) {
  Context.log('Handling job', name)
  queues[name].handler({type: name, data}, cb)
}

function installJobsRoute(app) {
  app.post('/jobs', (req, res) => {
    const name = req.body.name
    const data = req.body.data

    handleJob(name, data, (err, result) => {
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
  installJobsRoute
}
