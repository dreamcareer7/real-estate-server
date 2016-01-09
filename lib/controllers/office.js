/**
 * Retrieves a `User` object
 * @name getUser
 * @memberof controller/user
 * @instance
 * @function
 * @public
 * @summary GET /users/:id
 * @param {request} req - request object
 * @param {response} res - response object
 */
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

  app.get('/offices/search', getByMLS);
};

module.exports = router;
