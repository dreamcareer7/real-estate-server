/**
 * @namespace controller/agent
 */

function search(req, res) {
  var user_id = req.user.id;
  if(!req.query.mlsid)
    return res.error(Error.Validation('You must provide an agent MLS ID'));

  var mlsid = req.query.mlsid;
  Agent.getByMLSID(mlsid, function(err, agent) {
    if(err)
      return res.error(err);

    res.model(agent);
  });
}

var router = function(app) {
  var b = app.auth.bearer;

  app.get('/agents/search', b(search));
};

module.exports = router;
