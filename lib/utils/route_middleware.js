var models = {
  user:   User,
  agency: Agency,
  agent:  User,
  address:Address
}

function getModel(data) {
  if(!data.type)
    throw 'Model Type not defined for '+JSON.stringify(data);

  if(!models[data.type])
    throw 'Reference class not defined for type '+data.type;

  return models[data.type];
}

function publicizeData(data) {
  var Model = getModel(data);
  if(typeof Model.publicize === 'function')
    Model.publicize(data);
}

function returnModel(data) {
  publicizeData(data);

  this.req.res.json({
    code:'OK',
    data:data
  });
}

function returnCollection(models) {
  models.map(publicizeData);

  this.req.res.json({
    code:'OK',
    data:models
  });
}

function returnError(err) {
  this.req.res.status(err.http);

  console.log(this.req.method, this.req.path, err);
  if(err.http >= 500)
    return this.req.res.json({message:'Internal Error'});

  this.req.res.json(err);
}

function middleWare(app) {
  app.use(function(req, res, next) {
    res.model = returnModel;
    res.collection = returnCollection;
    res.error = returnError;
    next();
  });
}

module.exports = middleWare;