const expect = require('../utils/validator').expect
const am = require('../utils/async_middleware')

const Activity = require('../models/Activity')

function getUserTimeline(req, res) {
  const user_id = req.params.id

  expect(user_id).to.be.uuid

  const paging = {}
  req.pagination(paging)

  Activity.userTimeline(user_id, paging, (err, activities) => {
    if (err)
      return res.error(err)

    return res.collection(activities)
  })
}

function recordContactActivity(req, res) {
  const contact_id = req.params.id
  expect(contact_id).to.be.uuid

  const activity = req.body

  Activity.add(contact_id, 'Contact', activity, (err, activity) => {
    if (err)
      return res.error(err)

    return res.model(activity)
  })
}

function recordUserActivity(req, res) {
  const user_id = req.user.id
  expect(user_id).to.be.uuid

  const activity = req.body

  Activity.add(user_id, 'User', activity, (err, activity) => {
    if (err)
      return res.error(err)

    return res.model(activity)
  })
}

function recordRoomActivity(req, res) {
  const room_id = req.params.id
  const activity = req.body

  expect(room_id).to.be.a.uuid
  expect(activity).to.be.a('object')

  Activity.postToRoom({
    room_id,
    activity
  }, (err, activity) => {
    if (err)
      return res.error(err)

    return res.model(activity)
  })
}

const router = function (app) {
  const b = app.auth.bearer
  const auth = b.middleware

  app.get('/users/:id/timeline', b(getUserTimeline))
  app.post('/contacts/:id/timeline', b(recordContactActivity))
  app.post('/users/self/timeline', b(recordUserActivity))
  app.post('/rooms/:id/timeline', b(recordRoomActivity))
}

module.exports = router