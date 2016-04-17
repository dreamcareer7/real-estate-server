var async = require('async');

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
  note:                  Note,
  cma:                   CMA,
  property:              Property
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

    var cached = 0;
    var loaded = {};

function returnModel(data) {
  prepareModel(data, {}, (err, data) => {
    if(err)
      return this.req.res.error(err);

    publicizeData(data)

    this.req.res.json({
      code: 'OK',
      data: data
    });
  });
}

function prepareModel(data, cache, cb) {
//     console.log('Preparing', cache)
    fillModel(data, cb)

    function loadModel(model_name, id, cb) {
     var key = model_name+'_'+id;
      if(cache[key]) {
        cached++;
        return cb(null, cache[key]);
      }

      if(!loaded[model_name])
        loaded[model_name] = 0;

      loaded[model_name]++;

      global[model_name].get(id, (err, loaded) => {
        if(err)
          return cb(err);

        cache[key] = loaded;

        fillModel(loaded, (err, filled) => {
          if(err)
            return cb(err);

          cb(null, filled);
        })

      })
    }

    function fillModel(data, cb) {
//       console.log('Filling', data.type)
      var associations = getModel(data).associations || {};

      async.forEach(Object.keys(associations), (key, cb) => {
//         console.log('Loading association for', data.type, key)
        var definition = associations[key];

        var getModelName  = definition.model;
        if (typeof getModelName !== 'function')
          getModelName = (m, cb) => cb(null, definition.model)

        if(definition.collection) {
          var getIds  = definition.ids;
          if (typeof getIds !== 'function')
            getIds = (m, cb) => cb(null, data[key]);

        } else {
          var getId = definition.id;
          if (typeof getId !== 'function')
            getId = (m, cb) => cb(null, data[key]);
        }

        if (definition.collection) {
          getIds(data, (err, ids) => {
            if(err)
              return cb(err);

            if(!ids || ids.length < 1) {
              data[key] = definition.default_value ? definition.default_value() : null;
              cb();
              return ;
            }

            getModelName(data, (err, model_name) => {
              if(err)
                return cb(err);

              data[key] = [];
              async.map(ids, (id, cb) => {
                loadModel(model_name, id, (err, loaded) => {
                  if(err)
                    return cb(err);

                  data[key].push(loaded)
                  cb()
                })
              }, cb)
            });
          });
          return ;
        }

        getId(data, (err, id) => {
          if(err)
            return cb(err);

          if(!id && definition.optional) {
            data[key] = null;
            return cb();
          }

          if(!id && !definition.optional) {
            return cb(Error.Generic('Cannot find relation'))
          }

          getModelName(data, (err, model_name) => {
            if(err)
              return cb(err);

            loadModel(model_name, id, (err, loaded) => {
              if(err)
                return cb(err);

              data[key] = loaded;
              cb();
            });
          })
        })
      }, (err) => {
        if(err)
          return cb(err);

        cb(null, data)
      })
    }
}

function returnCollection(models) {
  console.log('1', (new Date()).getTime() - this.req.time)
  var total = 0;
  if (models[0] && models[0].total) {
    total = models[0].total;
    delete models[0].total;
  }

  models = models.filter(Boolean);

  var cache = {}
  var prepare = (model, cb) => {
    prepareModel(model, cache, cb);
  }

  async.mapSeries(models, prepare, (err, models) => {
    console.log('2', (new Date()).getTime() - this.req.time)
    console.log(cached, loaded)
    if(err)
      return res.error(err);

    models.forEach(publicizeData)

    this.req.res.json({
      code: 'OK',
      data: models,
      info: {
        count: models.length,
        total: total || 0
      }
    });
  })
}

function returnError(err) {
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
    req.time = new Date();
    req.pagination = getPaginationParams;
    res.model = returnModel;
    res.collection = returnCollection;
    res.error = returnError;
    res.success = returnSuccess;
    next();
  });
}

module.exports = middleWare;
