function getAll(req, res) {
  Tag.get_all(function(err, messages) {
    if(err)
      return res.error(err);

    return res.collection(messages);
  });
}

var router = function(app) {
  var b = app.auth.bearer;

  app.get('/tags', b(getAll));
};

module.exports = router;
