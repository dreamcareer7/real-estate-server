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

function publicizeData(data) {
  var Model = getModel(data);

  if(typeof Model.publicize === 'function')
    Model.publicize(data);
}

function prepareModel(base, cache, cb) {
  var data = JSON.parse(JSON.stringify(base));

//     console.log('Preparing', cache)
  fillModel(data, (err, filled) => {
    if(err)
      return cb(err);

//     console.log(filled);
    publicizeData(filled);
    cb(null, filled);
  })

  function loadModel(model_name, id, cb) {
    var key = model_name+'_'+id;
    if(cache[key]) {
      return cb(null, cache[key]);
    }

    global[model_name].get(id, (err, loaded) => {
      if(err)
        return cb(err);

      publicizeData(loaded)
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
    var original = JSON.parse(JSON.stringify(data));
    var associations = getModel(data).associations || {};

    async.forEach(Object.keys(associations), (key, cb) => {
//         console.log('Loading association for', data.type, key)
      var definition = associations[key];

      var getModelName  = definition.model;
      if (typeof getModelName !== 'function')
        getModelName = (m, cb) => cb(null, definition.model)

      var shouldDereference  = definition.dereference;
      if (typeof shouldDereference !== 'function')
        shouldDereference = (m, cb) => cb(null, true)

      if(definition.collection) {
        var getIds  = definition.ids;
        if (typeof getIds !== 'function')
          getIds = (m, cb) => cb(null, m[key]);

      } else {
        var getId = definition.id;
        if (typeof getId !== 'function')
          getId = (m, cb) => cb(null, m[key]);
      }

      if (definition.collection) {
        getIds(original, (err, ids) => {
          if(err)
            return cb(err);

          if(!ids || ids.length < 1) {
            data[key] = definition.default_value ? definition.default_value() : null;
            cb();
            return ;
          }

          shouldDereference(original, (err, should) => {
            if(err)
              return cb(err);

            if(!should) {
              data[key] = ids;
              return cb();
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
        });
        return ;
      }

      getId(original, (err, id) => {
        if(err)
          return cb(err);

        if(!id && definition.optional) {
          data[key] = null;
          return cb();
        }

        if(!id && !definition.optional) {
          return cb(Error.Generic('Cannot find relation'))
        }

        shouldDereference(original, (err, should) => {
            if(err)
              return cb(err);

            if(!should) {
              data[key] = id;
              return cb();
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
        });
      })
    }, (err) => {
      if(err)
        return cb(err);

      cb(null, data)
    })
  }
}

module.exports = {
  publicize:publicizeData,
  populate:prepareModel
}