const expect = require('../utils/validator').expect

function getTransactionDates (req, res) {
  const transaction_id = req.params.id

  expect(transaction_id).to.be.uuid

  Transaction.get(transaction_id, function (err) {
    if (err)
      return res.error(err)

    Idate.getForTransaction(transaction_id, function (err, dates) {
      if (err)
        return res.error(err)

      return res.collection(dates)
    })
  })
}

function deleteDate (req, res) {
  const idate_id = req.params.id

  expect(idate_id).to.be.uuid

  Idate.delete(idate_id, function (err, date) {
    if (err)
      return res.error(err)

    res.status(204)
    return res.end()
  })
}

function createDate (req, res) {
  const transaction_id = req.params.id
  const idate = req.body

  expect(transaction_id).to.be.uuid

  Transaction.get(transaction_id, function (err) {
    if (err)
      return res.error(err)

    idate.transaction = transaction_id
    Idate.create(idate, function (err, date) {
      if (err)
        return res.error(err)

      res.model(date)
    })
  })
}

function patchDate (req, res) {
  const idate_id = req.params.id
  const data = req.body

  expect(idate_id).to.be.uuid

  Idate.patch(idate_id, data, function (err, date) {
    if (err)
      return res.error(err)

    return res.model(date)
  })
}

const router = function (app) {
  const b = app.auth.bearer

  app.post('/transactions/:id/dates', b(createDate))
  app.get('/transactions/:id/dates', b(getTransactionDates))
  app.delete('/dates/:id', b(deleteDate))
  app.put('/dates/:id', b(patchDate))
}

module.exports = router
