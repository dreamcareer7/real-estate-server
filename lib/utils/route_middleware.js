var models = {
  user:           User,
  agency:         Agency,
  agent:          User,
  address:        Address,
  listing:        Listing,
  shortlist:      Shortlist,
  recommendation: Recommendation,
  contact:        Contact,
  url:            Url,
  count:          Count,
  message_room:   MessageRoom,
  message:        Message,
  alert:          Alert,
  s3:             S3
}

function getModel(data) {
  if(!data.type)
    throw 'Model Type not defined for '+JSON.stringify(data);

  if(!models[data.type])
    throw 'Reference class not defined for type '+data.type;

  return models[data.type];
}

function getPaginationParams(params) {
  params.type = 'Default';
  params.ascending = false;
  params.limit = this.res.req.query.limit || 20;

  var since_id = this.res.req.query.since_id;
  var max_id = this.res.req.query.max_id;

  params.id = since_id || max_id || 'ea6f67b8-ba08-11e4-86c0-5404a61babbf';

  if (since_id) {
    params.type = 'Since';
    params.ascending = true;
  }
  else if (max_id) {
    params.type = 'Max';
    params.ascending = false;
  }

  if (params.limit > 20)
    params.limit = 20
}

function publicizeData(data) {
  var Model = getModel(data);
  if(typeof Model.publicize === 'function')
    Model.publicize(data);
}

function returnModel(data) {
  publicizeData(data);

  this.req.res.json({
    code: 'OK',
    data: data
  });
}

function returnCollection(models) {
  models.map(publicizeData);

  this.req.res.json({
    code: 'OK',
    data: models,
    info: {
      count: models.length,
    }
  });
}

function returnError(err) {
  this.req.res.status(err.http);

  if(err.http >= 500)
    return this.req.res.json({message:'Internal Error'});

  this.req.res.json(err);
}

function returnSuccess(details) {
  var response = {
    data: 'OK'
  }

  if (typeof details === 'object') {
    for (var i in details)
      response[i] = details[i];
  }

  else if (typeof details == 'string') {
    response.message = details;
  }

  this.req.res.json(response);
}

function middleWare(app) {
  app.use(function(req, res, next) {
    req.pagination = getPaginationParams;
    res.model = returnModel;
    res.collection = returnCollection;
    res.error = returnError;
    res.success = returnSuccess;
    next();
  });
}

module.exports = middleWare;
