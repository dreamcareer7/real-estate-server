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

const router = function (app) {
  const b = app.auth.bearer

  app.post('/payments/stripe/customers', b(addCustomer))
  app.get('/payments/stripe/customers', b(getCustomers))
}

module.exports = router
