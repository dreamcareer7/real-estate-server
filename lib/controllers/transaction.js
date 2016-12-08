/**
 * @namespace controller/transaction
 */

const async = require('async')
const expect = require('../utils/validator.js').expect

function getUserTransactions (req, res) {
  const user_id = req.user.id

  User.get(user_id, function (err) {
    if (err)
      return res.error(err)

    Transaction.getForUser(user_id, function (err, transactions) {
      if (err)
        return res.error(err)

      return res.collection(transactions)
    })
  })
}

function getTransaction (req, res) {
  const transaction_id = req.params.id

  expect(transaction_id).to.be.uuid

  Transaction.get(transaction_id, function (err, transaction) {
    if (err)
      return res.error(err)

    res.model(transaction)
  })
}

function deleteTransaction (req, res) {
  const transaction_id = req.params.id

  expect(transaction_id).to.be.uuid

  Transaction.delete(transaction_id, function (err, transaction) {
    if (err)
      return res.error(err)

    res.status(204)
    return res.end()
  })
}

function createTransaction (req, res) {
  const user_id = req.user.id
  const transaction = req.body

  User.get(user_id, function (err) {
    if (err)
      return res.error(err)

    transaction.user = user_id

    Transaction.create(transaction, function (err, transaction) {
      if (err)
        return res.error(err)

      res.model(transaction)
    })
  })
}

function assign (req, res) {
  const transaction_id = req.params.id
  const roles = req.body.roles

  expect(transaction_id).to.be.uuid

  if (!Array.isArray(roles))
    return res.error(Error.Validation('roles must be an array of roles'))

  async.auto({
    transaction: cb => {
      return Transaction.get(transaction_id, cb)
    },
    roles: [
      'transaction',
      cb => {
        return Transaction.addRoles(transaction_id, roles, cb)
      }
    ],
    get: [
      'roles',
      cb => {
        return Transaction.get(transaction_id, cb)
      }
    ]
  }, (err, results) => {
    if (err)
      return res.error(err)

    return res.model(results.get)
  })
}

function withdraw (req, res) {
  const transaction_id = req.params.id
  const contact = req.params.rid

  expect(transaction_id).to.be.uuid
  expect(contact).to.be.uuid

  Transaction.withdraw(transaction_id, contact, function (err) {
    if (err)
      return res.error(err)

    Transaction.get(transaction_id, function (err, transaction) {
      if (err)
        return res.error(err)

      return res.model(transaction)
    })
  })
}

function patchTransaction (req, res) {
  const transaction_id = req.params.id
  const data = req.body

  expect(transaction_id).to.be.uuid

  Transaction.patch(transaction_id, data, function (err, transaction) {
    if (err)
      return res.error(err)

    return res.model(transaction)
  })
}

function attach (req, res) {
  const transaction_id = req.params.id

  expect(transaction_id).to.be.uuid

  S3.uploadAttachment(req, 'Transaction', transaction_id, function (err, transaction) {
    if (err)
      return res.error(err)

    return res.model(transaction)
  })
}

function detach (req, res) {
  const transaction_id = req.params.id
  const attachment_id = req.params.rid

  expect(transaction_id).to.be.uuid
  expect(attachment_id).to.be.uuid

  Attachment.unlink(transaction_id, attachment_id, err => {
    if (err)
      return res.error(err)

    Transaction.get(transaction_id, (err, transaction) => {
      if (err)
        return res.error(err)

      return res.model(transaction)
    })
  })
}

function addNote (req, res) {
  const transaction_id = req.params.id
  const user_id = req.user.id
  const note = req.body.note

  expect(transaction_id).to.be.uuid

  Note.add(transaction_id, user_id, note, 'Transaction', function (err) {
    if (err)
      return res.error(err)

    Transaction.get(transaction_id, function (err, transaction) {
      if (err)
        return res.error(err)
      return res.model(transaction)
    })
  })
}

function getNotes (req, res) {
  const transaction_id = req.params.id
  const user_id = req.user.id

  expect(transaction_id).to.be.uuid

  Note.get(transaction_id, user_id, function (err, notes) {
    if (err)
      return res.error(err)

    return res.collection(notes)
  })
}

function removeNote (req, res) {
  const note_id = req.params.nid

  expect(note_id).to.be.uuid

  Note.remove(note_id, function (err) {
    if (err)
      return res.error(err)

    res.status(204)
    return res.end()
  })
}

const router = function (app) {
  const b = app.auth.bearer

  app.post('/transactions', b(createTransaction))
  app.post('/transactions/:id/roles', b(assign))
  app.delete('/transactions/:id/roles/:rid', b(withdraw))
  app.get('/transactions', b(getUserTransactions))
  app.get('/transactions/:id', b(getTransaction))
  app.delete('/transactions/:id', b(deleteTransaction))
  app.put('/transactions/:id', b(patchTransaction))
  app.post('/transactions/:id/attachments', b(attach))
  app.delete('/transactions/:id/attachments/:rid', b(detach))
  app.post('/transactions/:id/notes', b(addNote))
  app.get('/transactions/:id/notes', b(getNotes))
  app.delete('/transactions/:id/notes/:nid', b(removeNote))
}

module.exports = router
