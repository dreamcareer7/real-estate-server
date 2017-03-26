const db = require('../utils/db')
const validator = require('../utils/validator.js')
const async = require('async')

Review = {}

Orm.register('review', Review)


const schema = {
  type: 'object',
  properties: {
    deal: {
      type: 'string',
      uuid: true,
      required: true
    },

    created_by: {
      type: 'string',
      uuid: true,
      required: true
    },

    state: {
      type: 'string',
      required: true,
      enum: ['Pending', 'Approved', 'Rejected']
    }
  }
}

const validate = validator.bind(null, schema)

Review.get = (id, cb) => {
  db.query('review/get', [id], (err, res) => {
    if (err)
      return cb(err)

    cb(null, res.rows[0])
  })
}

const notifyBackoffice = (review, cb) => {
  const deal = cb => {
    Deal.get(review.deal, cb)
  }

  const brand = (cb, results) => {
    if (!results.deal.brand)
      return cb()

    Brand.get(results.deal.brand, cb)
  }

  const user = cb => {
    User.get(review.created_by, cb)
  }

  const notification = (cb, results) => {
    const brand = results.brand
    if (!brand)
      return cb()

    if (!brand.roles)
      return cb()

    if (!brand.roles.Backoffice)
      return cb()

    const issue = (uid, cb) => {
      const notification = {}
      notification.action = 'Submitted'
      notification.object = review.id
      notification.object_class = 'Review'
      notification.message = `${results.user.display_name} submitted a review`

      Notification.issueForUser(notification, uid, cb)
    }

    async.forEach(brand.roles.Backoffice, issue, cb)
  }

  async.auto({
    deal,
    user,
    brand: ['deal', brand],
    notification: ['brand', 'user', notification]
  }, cb)
}

const notifyOwner = (review, cb) => {
  User.get(review.created_by, (err, reviewer) => {
    if (err)
      return cb(err)

    const notification = {}
    notification.action = 'Submitted'
    notification.object = review.id
    notification.object_class = 'Review'
    notification.message = `${reviewer.display_name} reviewed your documents`

    Notification.issueForUser(notification, review.owner, cb)
  })
}

Review.create = (review, cb) => {
  const save = cb => {
    db.query('review/insert', [
      review.deal,
      review.file,
      review.envelope,
      review.envelope_document,
      review.created_by,
      review.state,
      review.comment
    ], cb)
  }

  const get = (cb, results) => {
    Review.get(results.save.rows[0].id, cb)
  }

  const notify = (cb, results) => {
    notifyBackoffice(results.review, cb)
  }

  const done = (err, results) => {
    if (err)
      return cb(err)

    cb(null, results.review)
  }

  async.auto({
    validate: cb => validate(review, cb),
    save: ['validate', save],
    review: ['save', get],
    notify: ['review', notify]
  }, done)
}

Review.update = (review, cb) => {
  const save = cb => {
    db.query('review/update', [
      review.id,
      review.created_by,
      review.state,
      review.comment
    ], cb)
  }

  const done = (err, results) => {
    if (err)
      return cb(err)

    Review.get(review.id, cb)
  }

  const get = cb => Review.get(review.id, cb)

  const notification = (cb, results) => {
    if (review.owner === review.created_by)
      return notifyBackoffice(review, cb)

    notifyOwner(review, cb)
  }

  async.auto({
    validate: cb => validate(review, cb),
    save: ['validate', save],
    review: ['save', get],
    notification: ['save', notification],
  }, done)
}