var async = require('async');

Orm = {};

var models = {};

Orm.register = (name, model) => {
  models[name] = model;
}

Orm.populate = prepareModel;

function getModel(data) {
  if(data.type && models[data.type])
    return models[data.type];

  return null;
}

function publicizeData(data) {
  var Model = getModel(data);

  if(!Model) //Model not defined.
    return ;

  if(typeof Model.publicize === 'function')
    Model.publicize(data);
}

function prepareModel(base, cache, cb, enabled) {
  if(!enabled)
    enabled = [];

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
    var associations = {};

    var Model = getModel(data);
    if(Model && Model.associations)
      associations = Model.associations;

    async.forEach(Object.keys(associations), (key, cb) => {
      var definition = associations[key];

      var association_name = data.type+'.'+key;
      if(definition.enabled === false && enabled.indexOf(association_name) < 0)
        return cb();

      var getModelName  = definition.model;
      if (typeof getModelName !== 'function')
        getModelName = (m, cb) => cb(null, definition.model)

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