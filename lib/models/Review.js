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

    envelope_document: {
      type: [null, 'string'],
      uuid: true,
      required: false
    },

    file: {
      type: [null, 'string'],
      uuid: true,
      required: false
    },

    state: {
      type: 'string',
      required: true,
      enum: ['Pending', 'Approved', 'Rejected']
    }
  }
}

const _validate = validator.bind(null, schema)

const validate = (review, cb) => {
  if (!review.file && !review.envelope_document)
    return cb(Error.Validation('Please provide either a file or an envelope document'))

  if (review.file && review.envelope_document)
    return cb(Error.Validation('You can only provide a file or an envelope document, not both'))

  _validate(review, cb)
}

Review.get = (id, cb) => {
  db.query('review/get', [id], (err, res) => {
    if (err)
      return cb(err)

    if (res.rows.length < 1)
      return cb(Error.ResourceNotFound(`Review ${id} not found`))

    cb(null, res.rows[0])
  })
}

const notifyBackoffice = (options, cb) => {
  let comment = options.review.comment
  if (!comment)
    comment = 'Review request submitted for '

  if (options.file)
    comment += options.file.name

  if (options.envelope_document)
    comment += options.envelope_document.title

  const message = {
    message_type: 'TopLevel',
    comment,
    author: options.review.created_by
  }

  notifyRoom(options.review, message, cb)
}

const notifyOwner = (options, cb) => {
  let comment

  if (options.file)
    comment += options.file.name

  if (options.envelope_document)
    comment += options.envelope_document.title

  comment += ' marked as ${review.state}'

  const message = {
    author: options.review.updated_by,
    message_type: 'TopLevel',
    comment
  }

  notifyRoom(options.review, message, cb)
}

const notifyRoom = (review, message, cb) => {
  const deal = cb => Deal.get(review.deal, cb)

  const brand = (cb, results) => {
    if (!results.deal.brand)
      return cb()

    //We need to get the brand for the review owner so it has the chatroom id of the reviewer with backoffice
    Brand.get(results.deal.brand, cb, review.created_by)
  }

  const send = (cb, results) => {
    if (!results.brand)
      return cb()

    // Reviewer has no room with the brand
    if (!results.brand.room)
      return cb()

    Message.post(results.brand.room, message, true, cb)
  }

  async.auto({
    deal,
    brand: ['deal', brand],
    message: ['brand', send]
  }, cb)
}

Review.create = (review, cb) => {
  const save = cb => {
    db.query('review/insert', [
      review.deal,
      review.file,
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
    notifyBackoffice({
      review: results.review,
      file: results.file,
      envelope_document: results.envelope_document
    }, cb)
  }

  const done = (err, results) => {
    if (err)
      return cb(err)

    cb(null, results.review)
  }

  const file = cb => {
    if (!review.file)
      return cb()

    AttachedFile.get(review.file, cb)
  }

  const envelope_document = cb => {
    if (!review.envelope_document)
      return cb()

    EnvelopeDocument.get(review.envelope_document, cb)
  }

  async.auto({
    validate: cb => validate(review, cb),
    save: ['validate', save],
    review: ['save', get],
    file,
    envelope_document,
    notify: ['review', 'file', 'envelope_document', notify]
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
    const args = {
      review: results.review,
      file: results.file,
      envelope_document: results.envelope_document
    }

    if (review.created_by === review.updated_by)
      return notifyBackoffice(args, cb)

    notifyOwner(args, cb)
  }

  const file = cb => {
    if (!review.file)
      return cb()

    AttachedFile.get(review.file, cb)
  }

  const document = cb => {
    if (!review.envelope_document)
      return cb()

    EnvelopeDocument.get(review.envelope_document, cb)
  }

  async.auto({
    validate: cb => validate(review, cb),
    save: ['validate', save],
    review: ['save', get],
    file,
    document,
    notification: ['save', 'file', 'document', 'review', notification],
  }, done)
}