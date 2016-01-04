/**
 * @namespace controller/idate
 */

var async = require('async');

function getTransactionDates(req, res) {
  var transaction_id = req.params.id;
  var user_id = req.user.id;

  Transaction.get(transaction_id, function(err) {
    if(err)
      return res.error(err);

    Idate.getForTransaction(transaction_id, function(err, dates) {
      if(err)
        return res.error(err);

      return res.collection(dates);
    });
  });
}

function deleteDate(req, res) {
  var idate_id = req.params.id;

  Idate.delete(idate_id, function(err, date) {
    if(err)
      return res.error(err);

    res.status(204);
    return res.end();
  });
}

function createDate(req, res) {
  var user_id = req.user.id;
  var transaction_id = req.params.id;
  var idate = req.body;

  Transaction.get(transaction_id, function(err) {
    if(err)
      return res.error(err);

    idate.transaction = transaction_id;
    Idate.create(idate, function(err, date) {
      if(err)
        return res.error(err);

      res.model(date);
    });
  });
}

function patchDate(req, res) {
  var idate_id = req.params.id;
  var data = req.body;

  Idate.patch(idate_id, data, function(err, date) {
    if(err)
      return res.error(err);

    return res.model(date);
  });
}

var router = function(app) {
  var b = app.auth.bearer;

  app.post('/transactions/:id/dates', b(createDate));
  app.get('/transactions/:id/dates', b(getTransactionDates));
  app.delete('/dates/:id', b(deleteDate));
  app.put('/dates/:id', b(patchDate));
};

module.exports = router;
