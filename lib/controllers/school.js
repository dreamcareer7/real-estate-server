var search = (req, res) => {
  var term = req.query.q;
  if(term && term.length < 3) {
    res.collection([]);
    return ;
  }

  School.search(term, (err, schools) => {
    if(err)
      return res.error(err);

    res.collection(schools);
  });
}

var searchDistricts = (req, res) => {
  var term = req.query.q;
  if(term && term.length < 3) {
    res.collection([]);
    return ;
  }

  School.searchDistricts(term, (err, districts) => {
    if(err)
      return res.error(err);

    res.collection(districts);
  });
}

var router = function(app) {
  app.get('/schools/search', app.auth.optionalBearer(search));
  app.get('/schools/districts/search', app.auth.optionalBearer(searchDistricts));
};

module.exports = router;
