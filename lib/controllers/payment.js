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

const router = function (app) {
  const b = app.auth.bearer

  app.post('/payments/stripe/customers', b(addCustomer))
}

module.exports = router
