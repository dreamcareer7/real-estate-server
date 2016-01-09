function getByMLS(req, res) {
  var mls_id = req.query.mlsid;

  Office.getByMLS(mls_id, function(err, office) {
    if(err)
      return res.error(err);

    res.model(office);
  });
}

var router = function(app) {
  var b = app.auth.bearer;

  app.get('/offices/search', b(getByMLS));
};

module.exports = router;
