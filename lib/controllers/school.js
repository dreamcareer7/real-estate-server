var search = (req, res) => {
  var term = req.query.q;
  if(term && term.length < 3) {
    res.collection([]);
    return ;
  }

  School.search(term, (err, schools) => {
    if(err)
      return res.error(err);

    res.json(schools);
  });
}

var router = function(app) {
  app.get('/schools/search', app.auth.optionalBearer(search));
};

module.exports = router;
