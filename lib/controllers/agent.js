/**
 * @namespace controller/agent
 */

var config = require('../config.js');

function search(req, res) {
  var id;

  if(req.query.mlsid) {
    id = req.query.mlsid;
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

function create(req, res) {
  if(config.webapp.base_url === 'https://rechat.com') //For god's sake WTF is this.
    return res.error(Error.MethodNotAllowed());

  var agent = req.body;

  Agent.create(agent, (err) => {
    if(err) {
      console.log(err);
      return res.error(err);
    }

    res.status(201);
    return res.end();
  });
}

var router = function(app) {
  var b = app.auth.bearer;
  var ob = app.auth.optionalBearer;

  app.post('/agents', create);
  app.get('/agents/search', ob(search));
  app.get('/agents/:id', b(get));
  app.post('/agents/report', b(report));
};

module.exports = router;
