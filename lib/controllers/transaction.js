/**
 * @namespace controller/transaction
 */

function getRoomTransactions(req, res) {
  var room_id = req.params.id;

  Room.get(room_id, function(err) {
    if(err)
      return res.error(err);

    Transaction.getForRoom(room_id, function(err, transactions) {
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
  var room_id = req.params.id;
  var transaction = req.body;

  Room.get(room_id, function(err) {
    if(err)
      return res.error(err);

    transaction.room = room_id;
    Transaction.create(transaction, function(err, transaction) {
      if(err)
        return res.error(err);

      res.model(transaction);
    });
  });
}

var router = function(app) {
  var b = app.auth.bearer;

  app.post('/rooms/:id/transactions', b(createTransaction));
  app.get('/rooms/:id/transactions', b(getRoomTransactions));
  app.get('/transactions/:id', b(getTransaction));
  app.delete('/transactions/:id', b(deleteTransaction));
};

module.exports = router;
