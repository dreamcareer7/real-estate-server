/**
 * @namespace controller/transaction
 */

function getUserTransactions(req, res) {
  var user_id = req.user.id;

  User.get(user_id, function(err) {
    if(err)
      return res.error(err);

    Transaction.getForUser(user_id, function(err, transactions) {
      if(err)
        return res.error(err);

      return res.collection(transactions);
    });
  });
}

function getTransaction(req, res) {
  var transaction_id = req.params.id;

  Transaction.get(transaction_id, function(err, transaction) {
    if(err)
      return res.error(err);

    res.model(transaction);
  });
}

function deleteTransaction(req, res) {
  var transaction_id = req.params.id;

  Transaction.delete(transaction_id, function(err, transaction) {
    if(err)
      return res.error(err);

    res.status(204);
    return res.end();
  });
}

function createTransaction(req, res) {
  var user_id = req.user.id;
  var transaction = req.body;

  User.get(user_id, function(err) {
    if(err)
      return res.error(err);

    transaction.user = user_id;
    Transaction.create(transaction, function(err, transaction) {
      if(err)
        return res.error(err);

      res.model(transaction);
    });
  });
}

var router = function(app) {
  var b = app.auth.bearer;

  app.post('/transactions', b(createTransaction));
  app.get('/transactions', b(getUserTransactions));
  app.get('/transactions/:id', b(getTransaction));
  app.delete('/transactions/:id', b(deleteTransaction));
};

module.exports = router;
