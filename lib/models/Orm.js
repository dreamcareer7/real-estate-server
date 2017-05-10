const async = require('async')

Orm = {}
const lodash = require('lodash')

/*
 * This model takes care of populating data objects.
 * To understand the way it works, you need to be familiar with several concepts.
 *
 * 1. Associations.
 *
 * Each model can declare a set of associations (relations) with other models.
 * For example, a Room, can have an owner. The owner is a "User".
 * If the Room model declares this association, any time a room object
 * is being sent to clients, will have the "owner" populated as well.
 *
 * You can declare associations for your models like this:
 *
 * MyModel.associations = {
 *  association_1: {association1_decleration},
 *  association_2: {association2_decleration},
 *  ...
 * }
 *
 * There are 2 kinds of associations: Singles or collections.
 * A single association basically resembled a One-To-One  relationship,
 * while a collection association resembled a One-To_Many relationship.
 * For example a room can has several users. Therefore, `room.users` should
 * be an array of User objects. (One to many)
 *
 * However, a room can have only one `owner`. (One to one)
 *
 * A one-to-one association can have the following paramets:
 * `model` [String|Function]
 *         A string pointing to the Model that this association connects to. (Like 'User')
 *         You can also provide a function that will take in a model and return the
 *         model name that must be used based on data. Like this:
 *         (model, cb) => cb(null, model.subject_class)
 *         In this case, the model will be connection to whatever model that is stored
 *         in subject_class property
 *
 * `id`    [Function] (Optional)
 *         A function that determines the ID of the relation that must be fetched.
 *
 *
 * `optional` [Boolean] Default: false
 *         Declares if this association is optional or not.
 *         If the association is not optional but is missing, Orm will throw an error
 *         while populating it as it shows an underlying issue
 *
 *
 */

const type_to_model = {}
const model_name_to_type = {}
const model_name_to_model = {}

Orm.register = (type, model_name) => {
  type_to_model[type] = model_name
  model_name_to_type[model_name] = type
  model_name_to_model[model_name] = global[model_name]
}

function getModel (data) {
  const model_name = type_to_model[data.type]

  return model_name_to_model[model_name]
}

function getModelName(type) {
  return type_to_model[type]
}

function publicizeData (data) {
  const Model = getModel(data)

  // Model not defined.
  if (!Model)
    return

  if (typeof Model.publicize === 'function')
    Model.publicize(data)
}

const polyfillGetAll = Model => {
  return (ids, cb) => {
    async.map(ids, Model.get, cb)
  }
}

const promisify = require('../utils/promisify')

const getAll = async (model_name, ids) => {
  const Model = model_name_to_model[model_name]

  const getAll = Model.getAll ? promisify(Model.getAll) : promisify(polyfillGetAll(Model))

  return getAll(ids)
}

const populate = async ({models, associations, stash}) => {
  /* This is a recursive function. It populates associations
   * for a collection of models.
   * Populated models might need to be  populated as well,
   * In that case the function will be called recursively.
   * This line makes sure it wont be called infinitely
   */
  if (models.length < 1)
    return []

  /* Some associations are enabled by default.
   * enabled argument is an array of associations which
   * must be enabled explicitely due by the caller
   * It should look like this:
   * ['room.ownner', 'room.messages', 'alert.created_by']
   * Its optional though. Its its not provided, just assume its empty
   */
  if (!associations)
    associations = []

  /*
   * Keeps the list of models we should fetch. Like this:
   * {
   *  User: [1,2,3],
   *  Room: [4,5,6],
   * }
   */
  const toLoad = {}

  /*
   * Just adds a model to toLoad. Basically queues up a model to be fetched.
   */
  const add = ({model, id}) => {
    const type = model_name_to_type[model]
    if (stash[type] && stash[type][id])
      return

    if (!toLoad[model])
      toLoad[model] = new Set

    toLoad[model].add(id)
  }

  /*
   * The basis of this function are the concept of "Skeletons".
   * An skeleton is an object, describing the models that
   * we would have to load and attach to an model
   * in order to call it populated.
   *
   * For example, imagine a `room` model like this:
   * {
   *  id: 1,
   *  title: 'My room',
   *  ...
   *  owner: 10,                User 10
   *  users: [10,11,12,13],     Users [10,11,12,13]
   *  latest_message: 5         Message 5
   * }
   *
   * This model has associations on its `owner`, `users` and `lastest_message`
   *
   * An skeleton for this rooms looks like this:
   *
   * {
   *  owner: {model: 'User', id: 10},
   *  users: [
   *    {model: 'User', id: 10},
   *    {model: 'User', id: 11},
   *    {model: 'User', id: 12},
   *    {model: 'User', id: 13}
   *  ],
   *  latest_message: {model: 'Message', id: 5}
   * },
   */

  /* Later, when we have loaded the associations, we would
   * need the source data and the skeletons to re-construct the data.
   * this array keeps all the models and their skeletons so we can construct them later
   */

  /*
   * Adds a model (that must be populated) and its skeleton.
   * Also adds all the associations that must be loaded for it
   * toLoad construct so we know load it below.
   */
//   const addSkeleton = (data, skeleton) => {
//     stash[][id] = [data, skeleton]

//   }

  const addToStash = (model, skeleton) => {
    const model_name = model.type

    if (!stash[model_name])
      stash[model_name] = {}

    stash[model_name][model.id] = [model, skeleton]
  }

  /* Gets all the skeletons for the models in collection
   * and adds them to skeletons construct
   */
  await Promise.all(models.map(async data => {
    const skeleton = await fetchSkeleton({data, enabled:associations})
    addToStash(data, skeleton)

    Object.keys(skeleton).forEach(key => {
      if (Array.isArray(skeleton[key])) {
        skeleton[key].forEach(add)
      } else
        add(skeleton[key])
    })
  }))


  /*
   * Promises to load all the associations we have.
   * Loading is actually done in the getAll() function.
   * Which takes a model name like `User` and an array of ids
   */
  const loadAll = () => {
    const promises = Object.keys(toLoad).map(model_name => {
      return getAll(model_name, Array.from(toLoad[model_name]))
    })

    return Promise.all(promises)
  }

  /*
   * Ok, here we have all the models that we need in order to
   * populate this skeleton.
   *
   * The construct was created a result of a Promise.all()
   * It looks like this:
   * [
   *  [{User1},{User2},{User3}],
   *  [{Room1},{Room2},{Room3}]
   * ]
   */
  const loaded = await loadAll()


  /*
   * But all the models in loaded construct
   * are plain. We must populated them as well.
   * Therefore, we gather them all up in an array
   * so we can call this function on them. Recursively.
   * So flat is just an array of models like this:
   * [
   *  {User1},
   *  {User2},
   *  {User3},
   *  {Room1},
   *  {Room2},
   *  {Room3},
   * ]
   */
  let flat = []
  loaded.forEach((models, i) => {
    models.forEach(model => {
      flat.push(model)
    })
  })

  /*
   * Now we have all our associations populated.
   * That means we have an array of models (just like loaded)
   * Except that its models are fully populated
   */
  const populated = await populate({
    models: flat,
    associations,
    stash
  })

  /* Now we have all the data we need.
   * Its now just a matter of `mounting` populated data
   * on top of original models collection.
   *
   * In order to make this a faster operation,
   * We create the `ra` construct which stands for Random Access.
   * It looks like this:
   *
   *  {
   *    User: [
   *      1: {User1},
   *      2: {User2},
   *      3: {User3}
   *    },
   *    Room: [
   *      1: {Room1},
   *      2: {Room2},
   *      3: {Room3}
   *    },
   *  }
   */
}

const fetchSkeleton = async ({data, enabled}) => {
  const Model = getModel(data)
  const associations = (Model && Model.associations) ? Model.associations : {}

  const mapping = {}

  for (let key in associations) {
    // If we are loading Room's users list:
    // `room.users` is association_name while key is just `users`
    const association_name = data.type + '.' + key
    const definition = associations[key]

    // Association must be enabled by default or explicitely enabled
    if (definition.enabled === false && enabled.indexOf(association_name) < 0) {
      delete data[key]
      continue
    }


    let model
    if (typeof definition.model === 'string')
      model = definition.model
    else
      model = await promisify(definition.model)(data)

    if (definition.collection) {
      let ids = []
      if (typeof definition.ids === 'function')
        ids = await promisify(definition.ids)(data)
      else
        ids = data[key]

      if (ids && ids.length > 0)
        mapping[key] = ids.map(id => {
          return {model, id}
        })
      else {
        if (definition.default_value)
          data[key] = definition.default_value(data)
        else
          data[key] = null
      }
    } else {
      let id

      if (typeof definition.id === 'function')
        id = await promisify(definition.id)(data)
      else
        id = data[key]

      if (id) {
        mapping[key] = {model, id}
      } else {
        if (definition.default_value)
          mapping[key] = definition.default_value(data)
        else
          data[key] = null
      }
    }
  }

  return mapping
}

Orm.NEST = 'nested'
Orm.REFERENCE = 'references'

const nest = ({models, stash}) => {
  const mount = model => {
    const skeleton = stash[model.type][model.id][1]

    const getByReference = association => {
      const type = model_name_to_type[association.model]
      return mount(stash[type][association.id][0])
    }

    Object.keys(skeleton).forEach(association_name => {
      const association = skeleton[association_name]

      if (Array.isArray(association)) {
        model[association_name] = association.map(getByReference)
        return
      }

      model[association_name] = getByReference(association)
    })

    publicizeData(model)
    return model
  }

  return models.map(mount)
}

Orm.populate = async function(options) {
  options.models = lodash.cloneDeep(options.models)

  const stash = {}

  if (!options.format)
    options.format = Orm.NEST

  try {
    options.stash = stash
    const skeletons = await populate(options)

    if (options.format = Orm.NEST)
      return nest(options)

    if (options.format = Orm.REFERENE)
      return reference(options)

    throw Error.Validation(`Unknown response format ${options.format}`)
  } catch(e) {
    console.log(e)
  }
}