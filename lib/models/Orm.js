const async = require('async')

Orm = {}

/*
 * This model takes care of populating data objects.
 * To understand the way it works, you need to be familiar with several concepts.
 *
 * === Entities ===
 *
 * An `entity` represents a single data unit.
 *
 * Each entity must have:
 *  - An ID.  A string that we can use later to fetch it. (Usually but not necessarily a uuid)
 *  - A type. A string unique to this model.
 *
 * For example, a user entity can look like this:
 *  {
 *    id: '66e110e0-37e2-11e7-bb6e-e4a7a08e15d4',
 *    type: 'user',
 *    email: 'emil@rechat.com',
 *    ...
 *  }
 *
 * === Models ===
 *
 * Each Rechat Model is a global variable starting with a capital letter that represents an entity.
 * Models are practically a bunch of functions under a namespace that allow you to operate on entities.
 *
 * Each Rechat Model Must:
 *
 *  1. Implement a Model.getAll(ids, cb) function.
 *     This function will get an array of ID's and returns entities with those ID's.
 *
 *  2. Register itself by calling `Orm.register('entity_type', 'Model_Name')`
 *
 * So, to represent a `user` identity, we should have a User model.
 *
 * User = {
 *  getAll: (ids, cb) => {...}
 * }
 *
 * Orm.register('user', 'User')
 *
 * The `Orm.register` call will let the Orm tool know that all entities with
 * type: 'user' must be handled by the User model. Basically, User model will
 * be responsible for handling all entities with type:'user'.
 *
 * === Associations ===
 *
 * Main purpose of the Orm tool is to make it easy for entities to have relations and associations.
 *
 * Each model should describe its associations in a declarative way.
 * That means, it should be able to tell what associations it has.
 * Then, the ORM tool, can be more effective and intelligent in fetching associations.
 *
 * For example, a Room, can have an owner. The owner is a "user".
 * If the Room model declares this association, any time a room entity
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
 * All associations can have one of these properties:
 *
 * `model` [String|Function]
 *         A string pointing to the Model that this association connects to. (Like 'User')
 *         For example, `room.owner` should be connected to `User` model as its supposed to return a User.
 *
 *         You can also provide a function that will take in a entity and return the
 *         model name that must be used based on entity. Like this:
 *         (model, cb) => cb(null, model.subject_class)
 *         In this case, the model will be connection to whatever model that is stored
 *         in subject_class property.
 *
 *         Use the function if the relation is not predefined and can differ based on each different entity.
 *
 * `enabled` [Boolean] Default: true
 *         Declares it this association should be populated by default or no
 *
 * The following properties are only applicable to One-To-One associations:
 *
 * `id`    [Function] (Optional)
 *         A function that determines the ID of the relation that must be fetched.
 *         If missing, Orm tool will assume the association name for this.
 *         For example, if you have a `room` entity that looks like this:
 *
 *         {
 *           id: 'a40394ae-37e5-11e7-bb6e-e4a7a08e15d4',
 *           type: 'room',
 *           owner: '66e110e0-37e2-11e7-bb6e-e4a7a08e15d4'
 *         }
 *
 *         You don't realy need the `id` function. Your association should look like:
 *
 *         Room.associations = {
 *           owner: {
 *             model: 'User'
 *           }
 *         }
 *
 *         But if the id of the is not stored on the object itself or depends
 *         on logic per-entity, you can provide a function:
 *
 *         Notification.associations = {
 *           subject: {
 *            model: (n, cb) => cb(null, n.subject_class),
 *            id: (n, cb) => cb(null, n.subject)
 *           }
 *         }
 *
 * `optional` [Boolean] Default: false
 *         Declares if this association is optional or not.
 *         If the association is not optional but is missing, Orm will throw an error
 *         while populating it as it shows an underlying issue
 *
 *
 */

// These just allow us to lookup for `User` given a `user` or vice versa with O(1) everywhere
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

  if (!Model)
    throw Error.Generic(`Model ${model_name} not found`)

  const getAll = Model.getAll ? Model.getAll : polyfillGetAll(Model)

  const promised = (getAll.constructor.name === 'AsyncFunction') ? getAll : promisify(getAll)

  console.log(promised)

  return promised(ids)
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
   * Keeps the list of entities we should fetch next. Like this:
   * {
   *  User: [1,2,3],
   *  Room: [4,5,6],
   * }
   */
  const toLoad = {}

  /*
   * Just queues a model to be fetch by adding it to toLoad construct.
   * If its already in the stash, it wont add it to queue as we already have it.
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
   * Each entity that is loaded will be added to stash using this function.
   * Please note that we will store both the entity and its skeleton.
   * Because when formatting everything, we need the skeleton of each entity.
   *
   * So the stash looks like this:
   *
   * {
   *  'Room': {
   *    123: [
   *      {type: 'room', id: 123, owner: 456}, <-- This is the room #123
   *      {owner: {model: 'User', id: 456}}    <-- This is the skeleton for room #123
   *    ]
   *   }
   * }
   */
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
    const skeleton = await fetchSkeleton({data, enabled: associations})
    addToStash(data, skeleton)

    Object.keys(skeleton).forEach(key => {
      if (Array.isArray(skeleton[key])) {
        skeleton[key].forEach(add)
      } else
        add(skeleton[key])
    })
  }))

  /*
   * Promises to load all the models we have toLoad.
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
  const flat = []
  loaded.forEach((models, i) => {
    models.forEach(model => {
      flat.push(model)
    })
  })


  /*
   * All the entities that we just fetched must be populated as well.
   * So just fetch all their associations recursively.
   */
  await populate({
    models: flat,
    associations,
    stash
  })
}

const fetchSkeleton = async ({data, enabled}) => {
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

  const Model = getModel(data)
  const associations = (Model && Model.associations) ? Model.associations : {}

  const mapping = {}

  for (const key in associations) {
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

const reference = ({models, stash}) => {
  const references = {}

  const mount = model => {
    const skeleton = stash[model.type][model.id][1]

    const linkToReference = association => {
      const type = model_name_to_type[association.model]
      const refd = stash[type][association.id][0]

      if (!references[refd.type])
        references[refd.type] = {}

      references[refd.type][refd.id] = refd

      mount(refd)

      return {
        type: 'reference',
        object_type: refd.type,
        id: refd.id
      }
    }

    Object.keys(skeleton).forEach(association_name => {
      const association = skeleton[association_name]

      if (Array.isArray(association)) {
        model[association_name] = association.map(linkToReference)
        return
      }

      model[association_name] = linkToReference(association)
    })

    publicizeData(model)
    return model
  }

  return {
    references,
    data: models.map(mount)
  }
}

Orm.populate = async function(options) {
  /*
   * The way population process goes is like this:
   * We take in a series of entities.
   * We create a new `Stash` that holds all the entities that we need.
   * We add the input entities to stash.
   * We collect all the relations to the input entities and add them all to stash.
   * We do this recursively for all the entities we have.
   * When all entities we need are collected in the stash, we pass the stash for formatters.
   * Formatters can format an output object using the stash.
   * The main functionality happens in the `populate` function which recursively collects
   * the entities and adds them all to the stash.
   */
  options.models = JSON.parse(JSON.stringify(options.models))

  const stash = {}

  if (!options.format)
    options.format = Orm.NEST

  try {
    options.stash = stash
    await populate(options)

    if (options.format === Orm.NEST)
      return nest(options)

    if (options.format === Orm.REFERENCE)
      return reference(options)

    throw Error.Validation(`Unknown response format ${options.format}`)
  } catch(e) {
    console.log(e)
  }
}
