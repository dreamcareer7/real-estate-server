function createAgency(req, res) {
  Agency.create(req.body, function(err, id) {
    if(err)
      return res.error(err);

    Agency.get(id, function(err, agency) {
      if(err)
        return res.error(err);

      res.status(201);
      res.model(agency);
    });
  });
}

function getAgency(req, res) {
  Agency.get(req.params.id, function(err, agency) {
    if(err)
      return res.error(err);

    if(!agency) {
      res.status(404);
      res.end();
    }

    res.status(200);
    res.model(agency);
  });
}

function deleteAgency(req, res) {
  Agency.get(req.params.id, function(err, agency) {
    if(err)
      return res.error(err);

    if(!agency) {
      res.status(404);
      res.end();
      return ;
    }

    Agency.delete(agency.id, function(err) {
      if(err)
        return res.error(err);

      res.status(204);
      res.end();
    });
  });
}

function updateAgency(req, res) {
  Agency.get(req.params.id, function(err, agency) {
    if(err)
      return res.error(err);

    if(!agency) {
      res.status(404);
      res.end();
      return ;
    }

    var data = req.body;
    data.type = agency.type;

    Agency.update(agency.id, data, function(err) {
      if(err)
        return res.error(err);

      res.status(200);
      res.end();
    });
  });
}

function createAgent(req, res) {
  var agent = req.body;
  agent.type = 'agent';
  agent.agency_id = req.params.agency_id;

  User.create(agent, function(err, id) {
    if(err)
      return res.error(err);

    User.get(id, function(err, agent) {
      if(err)
        return res.error(err);

        res.status(201);
        res.model(agent);
    });
  });
}

function getAgents(req, res) {
  Agency.getAgents(req.params.agency_id, function(err, agents) {
    if(err)
      return res.error(err);

    res.status(200);
    res.collection(agents);
  });
}

var router = function(app) {
  var b = app.auth.bearer;

  app.post('/agencies', b(createAgency));

  app.get('/agency/:id', b(getAgency));
  app.delete('/agency/:id', b(deleteAgency));
  app.put('/agency/:id', b(updateAgency));

  app.post('/agency/:agency_id/agents', b(createAgent));
  app.get('/agency/:agency_id/agents', b(getAgents));
}

module.exports = router;