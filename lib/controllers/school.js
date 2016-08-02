var search = (req, res) => {
  var term = req.query.q;
  if(term && term.length < 3) {
    School.search(term, (err, schools) => {
      if(err)
        return res.error(err);

      res.collection(schools);
    });
    return ;
  }

  var district = req.query.district;
  if(district) {
    School.getByDistrict(district, (err, schools) => {
      if(err)
        return res.error(err);

      res.collection(schools);
    });

    return ;
  }

  res.end();
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
