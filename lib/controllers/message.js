function postMessage (req, res) {
  const room_id = req.params.id
  const message = req.body
  message.author = req.user.id

  Room.get(room_id, function (err, room) {
    if (err)
      return res.error(err)

    Room.getUsers(room_id, (err, users) => {
      if (err)
        return res.error(err)

      if (!Room.belongs(users, message.author))
        return res.error(Error.Forbidden('User is not a member of this room'))

      Message.post(room_id, message, true, function (err, message) {
        if (err)
          return res.error(err)

        return res.model(message)
      })
    })
  })
}

function retrieveMessages (req, res) {
  const room_id = req.params.id
  const paging = {}
  req.pagination(paging)
  paging.recommendation = req.query.recommendation || 'None'
  paging.reference = req.query.reference || 'None'

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
