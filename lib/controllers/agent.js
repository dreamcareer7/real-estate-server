/**
 * @namespace controller/agent
 */

function search(req, res) {
  var id;

  if(req.query.mlsid) {
    id = req.query.mlsid;
    id = ObjectUtil.makeAllNumeric(id);
    id = ObjectUtil.trimLeadingZeros(id);

    Agent.getByMLSID(id, (err, agent) => {
      if(err)
        return res.error(err);

      return res.model(agent);
    });
  } else if(req.query.officemlsid) {
    id = req.query.officemlsid;
    Agent.getByOfficeId(id, (err, agents) => {
      if(err)
        return res.error(err);

      return res.collection(agents);
    });
  } else {
    return res.error(Error.Validation('Malformed search query'));
  }
}

function get(req, res) {
  var agent_id = req.params.id;

  Agent.get(agent_id, (err, agent) => {
    if(err)
      return res.error(err);

    return res.model(agent);
  });
}

function report(req, res) {
  Agent.report(req.body.criteria, (err, report) => {
    if(err)
      return res.error(err);

    res.collection(report);
  });
}

var router = function(app) {
  var b = app.auth.bearer;

  app.get('/agents/search', search);
  app.get('/agents/:id', b(get));
  app.post('/agents/report', b(report));
};

module.exports = router;
