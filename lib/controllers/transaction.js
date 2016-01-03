/**
 * @namespace controller/transaction
 */

var async = require('async');

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

function assign(req, res) {
  var user_id = req.user.id;
  var transaction_id = req.params.id;
  var contacts = req.body.contacts;

  if (!Array.isArray(contacts))
    return res.error(Error.Validation('contacts must be an array of contacts'));

  async.map(contacts, function(r, cb) {
    return Transaction.assign(transaction_id, r, cb);
  }, function(err) {
    if(err)
      return res.error(err);

    Transaction.get(transaction_id, function(err, transaction) {
      if(err)
        return res.error(err);

      return res.model(transaction);
    });
  });
}

function withdraw(req, res) {
  var user_id = req.user.id;
  var transaction_id = req.params.id;
  var contact = req.params.rid;

  Transaction.withdraw(transaction_id, contact, function(err) {
    if(err)
      return res.error(err);

    Transaction.get(transaction_id, function(err, transaction) {
      if(err)
        return res.error(err);

      return res.model(transaction);
    });
  });
}

function patchTransaction(req, res) {
  var transaction_id = req.params.id;
  var user_id = req.user.id;
  var data = req.body;

  Transaction.patch(transaction_id, data, function(err, transaction) {
    if(err)
      return res.error(err);

    return res.model(transaction);
  });
}

function addRole(req, res) {
  var transaction_id = req.params.id;
  var contact_id = req.params.cid;
  var roles = req.body.roles;

  Transaction.addContactRole(transaction_id, contact_id,roles, function (err) {
    if (err)
      return res.error(err);

    Transaction.get(transaction_id, function (err, transaction) {
      if (err)
        return res.error(err);

      return res.model(transaction);
    });
  });
}

function removeRole(req, res) {
  var transaction_id = req.params.id;
  var contact_id = req.params.cid;
  var role = req.params.r;

  Transaction.removeContactRole(transaction_id, contact_id, role, function (err) {
    if (err)
      return res.error(err);

    res.status(204);
    return res.end();
  });
}

var router = function(app) {
  var b = app.auth.bearer;

  app.post('/transactions', b(createTransaction));
  app.post('/transactions/:id/contacts', b(assign));
  app.delete('/transactions/:id/contacts/:rid', b(withdraw));
  app.get('/transactions', b(getUserTransactions));
  app.get('/transactions/:id', b(getTransaction));
  app.delete('/transactions/:id', b(deleteTransaction));
  app.put('/transactions/:id', b(patchTransaction));
  app.post('/transactions/:id/contacts/:cid/roles', b(addRole));
  app.delete('/transactions/:id/contacts/:cid/roles/:r', b(removeRole));
};

module.exports = router;
