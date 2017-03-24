const expect = require('../utils/validator.js').expect

function create(req, res) {
  const review = req.body

  review.created_by = req.user.id
  review.deal = req.params.deal

  Review.create(review, (err, review) => {
    if (err)
      return res.error(err)

    res.model(review)
  })
}

function update(req, res) {
  Review.get(req.params.id, (err, old) => {
    if (err)
      return res.error(err)

    const review = Object.assign(old, req.body)

    Review.update(review, (err, review) => {
      if (err)
        return res.error(err)

      res.model(review)
    })
  })
}

function review_access(req, res, next) {
  Review.get(req.params.id, (err, review) => {
    if (err)
      return res.error(err)

    Deal.limitAccess({
      user: req.user,
      deal_id: review.deal
    }, err => {
      if (err)
        res.error(err)

      next()
    })
  })
}

const deal_access = (req, res, next) => {
  expect(req.params.deal).to.be.uuid

  Deal.limitAccess({
    user: req.user,
    deal_id: req.params.deal
  }, err => {
    if (err)
      res.error(err)

    next()
  })
}

const router = function (app) {
  const auth = app.auth.bearer.middleware

  app.post('/deals/:deal/reviews', auth, deal_access, create)
  app.put('/reviews/:id', auth, review_access, update)
}

module.exports = router
