function get(req, res) {
  var brand_id = req.params.id;

  Brand.get(brand_id, function(err, brand) {
    if(err)
      return res.error(err);

    return res.model(brand);
  });
}

function search(req, res) {
  var subdomain = req.query.subdomain;

  Brand.getBySubdomain(subdomain, function(err, brand) {
    if(err)
      return res.error(err);

    return res.model(brand);
  });
}

var router = function(app) {
  app.get('/brands/search', app.auth.optionalBearer(search));
  app.get('/brands/:id',    app.auth.optionalBearer(get));
};

module.exports = router;
