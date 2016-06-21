function get(req, res) {
  var brand_id = req.params.id;

  Brand.get(brand_id, function(err, brand) {
    if(err)
      return res.error(err);

    return res.model(brand);
  });
}

var router = function(app) {
  app.get('/brands/:id', app.auth.optionalBearer(get));
};

module.exports = router;
