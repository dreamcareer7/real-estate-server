var search = (req, res) => {
  var term = req.query.q;
  if(term && term.length > 2) {
    School.search(term, (err, schools) => {
      if(err)
        return res.error(err);

      res.collection(schools);
    });
    return ;
  }

  var districts = req.query.districts;

  if((!districts) && req.query.district) {
    var districts = [req.query.district]; // Compatibility.
  }

  if(Array.isArray(districts) && districts.length > 0) {
    School.getByDistrict(districts, (err, schools) => {
      if(err)
        return res.error(err);

      res.collection(schools);
    });

    return ;
  }

  res.error(Error.Validation('Please specify query or districts'));
}

var searchDistricts = (req, res) => {
  var terms = ObjectUtil.queryStringArray(req.query.q);

  School.searchDistricts(terms, (err, districts) => {
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
