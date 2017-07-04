const expect = require('../utils/validator.js').expect

function postMessage (req, res) {
  const room_id = req.params.id
  const message = req.body
  message.author = req.user.id

  expect(room_id).to.be.uuid

  Room.get(room_id, function (err, room) {
    if (err)
      return res.error(err)

    if (!Room.belongs(room.users, message.author))
      return res.error(Error.Forbidden('User is not a member of this room'))

    Message.post(room_id, message, true, function (err, message) {
      if (err)
        return res.error(err)

      return res.model(message)
    })
  })
}

function retrieveMessages (req, res) {
  const room_id = req.params.id

  expect(room_id).to.be.uuid

  const paging = {}
  req.pagination(paging)
  paging.recommendation = req.query.recommendation || 'None'
  paging.reference = req.query.reference || 'None'

  expect(paging.recommendation).to.be.a('string')
  expect(paging.reference).to.be.a('string')

  Message.retrieve(room_id, paging, function (err, messages) {
    if (err)
      return res.error(err)

    return res.collection(messages)
  })
}

function postSeamlessEmail (req, res) {
  Message.postSeamlessEmail(req.body, err => {
    if (err)
      return res.error(err)

    res.status(200)
    return res.json({status: 'OK'})
  })
}

function postSeamlessSMS(req, res) {
  Message.postSeamlessSMS(req.body, err => {
    if (err)
      return res.error(err)

    res.set('Content-Type', 'application/json')
    res.status(200)
    return res.json({status: 'OK'})
  })
}

const router = function (app) {
  const b = app.auth.bearer

  app.post('/rooms/:id/messages', b(postMessage))
  app.post('/messages/email', postSeamlessEmail)
  app.post('/messages/sms', postSeamlessSMS)
  app.get('/rooms/:id/messages', b(retrieveMessages))
}

module.exports = router
