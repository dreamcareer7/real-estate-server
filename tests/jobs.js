const queues = Object.assign(
  require('../scripts/queues.js'),
  require('./queues.js')
)

module.exports = app => {
  app.post('/jobs', (req, res) => {
    const name = req.body.name
    const data = req.body.data

    queues[name].handler({data}, (err, result) => {
      if (err) {
        console.log(err)
        return res.json(err)
      }
      res.json(result)
    })
  })
}