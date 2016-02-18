var models = {
  user:                  User,
  agent:                 Agent,
  address:               Address,
  listing:               Listing,
  room:                  Room,
  recommendation:        Recommendation,
  contact:               Contact,
  url:                   Url,
  count:                 Count,
  message:               Message,
  alert:                 Alert,
  s3:                    S3,
  ses:                   SES,
  twilio:                Twilio,
  crypto:                Crypto,
  invitation:            Invitation,
  notification:          Notification,
  admin:                 Admin,
  object_util:           ObjectUtil,
  compact_listing:       CompactListing,
  compact_user:          CompactUser,
  phone_verification:    PhoneVerification,
  email_verification:    EmailVerification,
  tag:                   Tag,
  transaction:           Transaction,
  task:                  Task,
  important_date:        Idate,
  attachment:            Attachment,
  office:                Office,
  property_unit:         PropertyUnit,
  property_room:         PropertyRoom,
  note:                  Note
};

function getModel(data) {
  if(!data.type)
    throw 'Model Type not defined for ' + JSON.stringify(data);

  if(!models[data.type])
    throw 'Reference class not defined for type ' + data.type;

  return models[data.type];
}

function getPaginationParams(params) {
  var filter = this.res.req.query.filter;

  params.type = 'Init_C';
  params.limit = parseInt(this.res.req.query.limit) || 20;
  params.filter = (filter) ? filter : null;

  var since_value = this.res.req.query.since_value;
  var max_value = this.res.req.query.max_value;
  var sorting_value = this.res.req.query.sorting_value;

  params.timestamp = parseFloat(since_value) || parseFloat(max_value) || (Date.now() / 1000);

  if (sorting_value === 'Creation') {
    if(since_value)
      params.type = 'Since_C';
    else if (max_value)
      params.type = 'Max_C';
    else
      params.type = 'Init_C';
  } else if(sorting_value === 'Update') {
    if(since_value)
      params.type = 'Since_U';
    else if(max_value)
      params.type = 'Max_U';
    else
      params.type = 'Init_U';
  }

  if(since_value)
    params.timestamp -= 0.001;
  else
    params.timestamp += 0.001;

  params.timestamp *= 1000000;
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
  var total = 0;
  if (models[0] && models[0].total) {
    total = models[0].total;
    delete models[0].total;
  }

  models = models.filter(Boolean);
  models.map(publicizeData);
  this.req.res.json({
    code: 'OK',
    data: models,
    info: {
      count: models.length,
      total: total || 0
    }
  });
}

function returnError(err) {
  this.req.res.status(err.http);
  throw err;
}

function returnSuccess(details) {
  var response = {
    data: 'OK'
  };

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
