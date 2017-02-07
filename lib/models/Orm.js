const async = require('async')

Orm = {}

const models = {}

Orm.register = (name, model) => {
  models[name] = model
}

Orm.populate = prepareModel

function getModel (data) {
  if (data.type && models[data.type])
    return models[data.type]

  return null
}

function publicizeData (data) {
  const Model = getModel(data)

  // Model not defined.
  if (!Model)
    return

  if (typeof Model.publicize === 'function')
    Model.publicize(data)
}

function prepareModel (base, cache, cb, enabled, referenced) {
  if (!enabled)
    enabled = []

  if (!cache.references)
    cache.references = {}

  const data = JSON.parse(JSON.stringify(base))

  // console.log('Preparing', cache)
  fillModel(data, (err, filled) => {
    if (err)
      return cb(err)

    // console.log(filled);
    publicizeData(filled)
    cb(null, filled)
  })

  function loadModel (model_name, id, cb) {
    const key = model_name + '_' + id
    if (cache[key]) {
      return cb(null, cache[key])
    }


    global[model_name].get(id, (err, loaded) => {
      if (err)
        return cb(err)

      publicizeData(loaded)
      cache[key] = loaded

      if (!cache.references[loaded.type])
        cache.references[loaded.type] = {}

      cache.references[loaded.type][id] = loaded

      fillModel(loaded, (err, filled) => {
        if (err)
          return cb(err)

        cb(null, filled)
      })
    })
  }

  function fillModel (data, cb) {
    // console.log('Filling', data.type)
    const original = JSON.parse(JSON.stringify(data))
    let associations = {}

    const Model = getModel(data)
    if (Model && Model.associations)
      associations = Model.associations

    async.forEach(Object.keys(associations), (key, cb) => {
      const definition = associations[key]

      const association_name = data.type + '.' + key
      if (definition.enabled === false && enabled.indexOf(association_name) < 0) {
        delete data[key]
        return cb()
      }

      let getModelName = definition.model
      if (typeof getModelName !== 'function')
        getModelName = (m, cb) => cb(null, definition.model)

      let getIds, getId
      if (definition.collection) {
        getIds = definition.ids
        if (typeof getIds !== 'function')
          getIds = (m, cb) => cb(null, m[key])
      } else {
        getId = definition.id
        if (typeof getId !== 'function')
          getId = (m, cb) => cb(null, m[key])
      }

      if (definition.collection) {
        getIds(original, (err, ids) => {
          if (err)
            return cb(err)

          if (!ids || ids.length < 1) {
            data[key] = definition.default_value ? definition.default_value() : null
            cb()
            return
          }

          getModelName(data, (err, model_name) => {
            if (err)
              return cb(err)

            data[key] = []
            async.map(ids, (id, cb) => {
              loadModel(model_name, id, (err, loaded) => {
                if (err)
                  return cb(err)

                if (referenced) {
                  data[key].push({
                    type: 'reference',
                    object_type: loaded.type,
                    id: loaded.id
                  })
                } else
                  data[key].push(loaded)
                cb()
              })
            }, cb)
          })
        })
        return
      }

      getId(original, (err, id) => {
        if (err)
          return cb(err)

        if (!id && definition.optional) {
          data[key] = null
          return cb()
        }

        if (!id && !definition.optional) {
          return cb(Error.Generic('Cannot find relation'))
        }

        getModelName(data, (err, model_name) => {
          if (err)
            return cb(err)

          loadModel(model_name, id, (err, loaded) => {
            if (err)
              return cb(err)

            if (referenced) {
              data[key] = {
                type: 'reference',
                object_type: loaded.type,
                id: loaded.id
              }
            } else
              data[key] = loaded

            cb()
          })
        })
      })
    }, (err) => {
      if (err)
        return cb(err)

      cb(null, data)
    })
  }
}
