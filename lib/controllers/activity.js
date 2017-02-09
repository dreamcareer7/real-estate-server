const expect = require('../utils/validator').expect

function getContactTimeline(req, res) {
  const contact_id = req.params.id
  const user_id = req.user.id

  expect(contact_id).to.be.uuid
  expect(user_id).to.be.uuid

  const paging = {}
  req.pagination(paging)

  Activity.contactTimeline(contact_id, paging, (err, activities) => {
    if(err)
      return res.error(err)

    return res.collection(activities)
  })
}

function getUserTimeline(req, res) {
  const user_id = req.params.id

  expect(user_id).to.be.uuid

  const paging = {}
  req.pagination(paging)

  Activity.userTimeline(user_id, paging, (err, activities) => {
    if(err)
      return res.error(err)

    return res.collection(activities)
  })
}

function recordContactActivity(req, res) {
  const contact_id = req.params.id
  expect(contact_id).to.be.uuid

  const activity = req.body

  Activity.add(contact_id, 'Contact', activity, (err, activity) => {
    if(err)
      return res.error(err)

    return res.model(activity)
  })
}

function recordUserActivity(req, res) {
  const user_id = req.user.id
  expect(user_id).to.be.uuid

  const activity = req.body

  Activity.add(user_id, 'User', activity, (err, activity) => {
    if(err)
      return res.error(err)

    return res.model(activity)
  })
}

const router = function (app) {
  const b = app.auth.bearer

  app.get('/contacts/:id/timeline', b(getContactTimeline))
  app.get('/users/:id/timeline', b(getUserTimeline))
  app.post('/contacts/:id/timeline', b(recordContactActivity))
  app.post('/users/self/timeline', b(recordUserActivity))
}

module.exports = router
