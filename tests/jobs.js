const Queue = require('../lib/utils/queue.js')

const queues = require('../scripts/queues.js')

Object.keys(queues).forEach(queue_name => {
  const definition = queues[queue_name]

  const handle = (job, done) => {
    console.log('Handling', queue_name)
    definition.handler(job, done)
  }

  Queue.process(queue_name, handle, definition.parallel)
})

module.exports = app => {
  app.post('/jobs', (req, res) => {
    const name = req.body.name
    const data = req.body.data

    const job = Queue.create(name, data)
      .save(err => {
        if (err)
          return res.error(err)
      })

      job.on('failed', (err) => {
        console.log('Failed', err)
      })

      job.on('complete', result => {
        res.json(result)
      })
  })
}