function createAgency(req, res) {
  Agency.create(req.body, function(err, id) {
    if(err)
      return res.error(err);

    Agency.get(id, function(err, agency) {
      if(err)
        return res.error(err);

      res.status(201);
      res.json(agency);
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
    res.json(agency);
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

var router = function(app) {
  app.post('/agency', createAgency);

  app.get('/agency/:id', getAgency);
  app.delete('/agency/:id', deleteAgency);
  app.put('/agency/:id', updateAgency);
}

module.exports = router;