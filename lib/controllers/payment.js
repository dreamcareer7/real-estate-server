const expect = require('../utils/validator').expect

function addCustomer(req, res) {
  const options = {
    token: req.body.token,
    user: req.user.id
  }

  Stripe.addCustomer(options, (err, customer) => {
    if (err)
      return res.error(err)

    res.model(customer)
  })
}

function getCustomers(req, res) {
  Stripe.getUserCustomers(req.user.id, (err, customers) => {
    if (err)
      return res.error(err)

    res.collection(customers)
  })
}

function deleteCustomers(req, res) {
  expect(req.params.id).to.be.uuid

  Stripe.getCustomer(req.params.id, (err, customer) => {
    if (err)
      return res.error(err)

    if (customer.owner !== req.user.id)
      return res.error(Error.Forbidden())

    Stripe.deleteCustomer(req.params.id, err => {
      if (err)
        res.error(err)

      res.status(204)
      return res.end()
    })
  })
}

const router = function (app) {
  const b = app.auth.bearer

  app.post('/payments/stripe/customers', b(addCustomer))
  app.get('/payments/stripe/customers', b(getCustomers))
  app.delete('/payments/stripe/customers/:id', b(deleteCustomers))
}

module.exports = router
