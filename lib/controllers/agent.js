/**
 * @namespace controller/agent
 */

function search(req, res) {
  var id;

  if(req.query.mlsid) {
    id = req.query.mlsid;
    Agent.getByMLSID(id, (err, agent) => {
      if(err)
        return res.error(err);

      res.model(agent);
    });
  } else if(req.query.officemlsid) {
    id = req.query.officemlsid;
    Agent.getByOfficeId(id, (err, agents) => {
      if(err)
        return res.error(err);

      res.collection(agents);
    });
  } else {
    return res.error(Error.Validation('Malformed search query'));
  }
}

var router = function(app) {
  var b = app.auth.bearer;

  app.get('/agents/search', search);
};

module.exports = router;
