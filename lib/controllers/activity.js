const expect = require('../utils/validator').expect

function getTimeline(req, res) {
  const contact_id = req.params.id
  const user_id = req.user.id

  expect(contact_id).to.be.uuid
  expect(user_id).to.be.uuid

  const paging = {}
  req.pagination(paging)

  Activity.timeline(contact_id, paging, (err, activities) => {
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

  app.get('/contacts/:id/timeline', b(getTimeline))
  app.post('/contacts/:id/timeline', b(recordContactActivity))
  app.post('/users/self/timeline', b(recordUserActivity))
}

module.exports = router
