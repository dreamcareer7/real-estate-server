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

  fillModel(data, (err, filled) => {
    if (err)
      return cb(err)

    publicizeData(filled)
    cb(null, filled)
  })

  function loadModel (model_name, id, cb) {
    const key = model_name + '_' + id
    if (cache[key]) {
      return cb(null, cache[key])
    }

    console.log('Loading model', model_name, id)

    global[model_name].get(id, (err, loaded) => {
      console.log('Loaded model', model_name, id)
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
    console.log('Filling', data.type)
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
        console.log('Getting ids', association_name)
        getIds(original, (err, ids) => {
          console.log('Got ids', association_name)
          if (err)
            return cb(err)

          if (!ids || ids.length < 1) {
            data[key] = definition.default_value ? definition.default_value() : null
            cb()
            return
          }

          console.log('Getting model name', association_name)
          getModelName(data, (err, model_name) => {
            if (err)
              return cb(err)

            data[key] = []
            async.map(ids, (id, cb) => {
              console.log('loading model', association_name, id)
              loadModel(model_name, id, (err, loaded) => {
                console.log('loaded model', association_name, id)
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

      console.log('getting id', association_name, id)
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

        console.log('getting model name', association_name)
        getModelName(data, (err, model_name) => {
          console.log('got model name', association_name)
          if (err)
            return cb(err)

          console.log('loading model', association_name)
          loadModel(model_name, id, (err, loaded) => {
            console.loG('loaded model', association_name)
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
      console.log('filling completed for', model_name)
      if (err)
        return cb(err)

      cb(null, data)
    })
  }
}
