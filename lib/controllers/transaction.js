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
  var roles = req.body.roles;

  if (!Array.isArray(roles))
    return res.error(Error.Validation('roles must be an array of roles'));

  async.auto({
    transaction: cb => {
      return Transaction.get(transaction_id, cb);
    },
    roles: [
      'transaction',
      cb => {
        return Transaction.addRoles(transaction_id, roles, cb);
      }
    ],
    get: [
      'roles',
      cb => {
        return Transaction.get(transaction_id, cb);
      }
    ]
  }, (err, results) => {
    if(err)
      return res.error(err);

    return res.model(results.get);
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

  if (!Array.isArray(roles) || roles.length < 1)
    return res.error(Error.Validation('You must supply an array of at least one roles for this contact'));

  Transaction.addContactRole(transaction_id, contact_id, roles, function (err) {
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
  var role = req.params.role;

  Transaction.removeContactRole(transaction_id, contact_id, role, function (err) {
    if (err)
      return res.error(err);

    res.status(204);
    return res.end();
  });
}

function attach(req, res) {
  var transaction_id = req.params.id;

  S3.uploadAttachment(req, 'Transaction', transaction_id, function(err, transaction) {
    if(err)
      return res.error(err);

    return res.model(transaction);
  });
}

function detach(req, res) {
  var transaction_id = req.params.id;
  var attachment_id = req.params.rid;

  Attachment.unlink(transaction_id, attachment_id, err => {
    if(err)
      return res.error(err);

    Transaction.get(transaction_id, (err, transaction) => {
      if(err)
        return res.error(err);

      return res.model(transaction);
    });
  });
}

function addNote(req, res) {
  var transaction_id = req.params.id;
  var user_id = req.user.id;
  var note = req.body.note;

  Note.add(transaction_id, user_id, note, 'Transaction', function (err) {
    if (err)
      return res.error(err);


    Transaction.get(transaction_id, function (err, transaction) {
      if (err)
        return res.error(err);
      return res.model(transaction);
    })
  });
}

function getNotes(req, res) {
  var transaction_id = req.params.id;
  var user_id = req.user.id;

  Note.get(transaction_id, user_id, function (err, notes) {
    if (err)
      return res.error(err);

    return res.collection(notes);
  });
}

function removeNote(req, res) {
  var note_id = req.params.nid;

  Note.remove(note_id, function (err) {
    if (err)
      return res.error(err);

    res.status(204);
    return res.end();
  });
}

var router = function(app) {
  var b = app.auth.bearer;

  app.post('/transactions', b(createTransaction));
  app.post('/transactions/:id/roles', b(assign));
  app.delete('/transactions/:id/roles/:rid', b(withdraw));
  app.get('/transactions', b(getUserTransactions));
  app.get('/transactions/:id', b(getTransaction));
  app.delete('/transactions/:id', b(deleteTransaction));
  app.put('/transactions/:id', b(patchTransaction));
  app.post('/transactions/:id/attachments', b(attach));
  app.delete('/transactions/:id/attachments/:rid', b(detach));
  app.post('/transactions/:id/notes', b(addNote));
  app.get('/transactions/:id/notes', b(getNotes));
  app.delete('/transactions/:id/notes/:nid', b(removeNote));
};

module.exports = router;
