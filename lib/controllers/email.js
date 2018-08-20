const expect = require('../utils/validator.js').expect
const am = require('../utils/async_middleware.js')

const addEvent = async (req, res) => {
  expect(req.body).to.be.an('object')

  const e = req.body['event-data']

  const event = {
    email: e.message.headers['message-id'],
    event: e.event,
    created_at: e.timestamp,
    recipient: e.recipient
  }

  await Email.addEvent(event)

  res.end()
}

const router = function (app) {
  app.post('/emails/events', am(addEvent))
}

module.exports = router