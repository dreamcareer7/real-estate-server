// These just allow us to lookup for `User` given a `user` or vice versa with O(1) everywhere
/** @type {Record<string, string>} */
const type_to_model = {}
/** @type {Record<string, string>} */
const model_name_to_type = {}
/** @type {Record<string, import('.').OrmModelDefinition>} */
const model_name_to_model = {}

/**
 * @template I
 * @template T
 * @param {string} type
 * @param {string} model_name
 * @param {import('.').OrmModelDefinition<I, T>} model
 */
function register(type, model_name, model) {
  type_to_model[type] = model_name
  model_name_to_type[model_name] = type
  model_name_to_model[model_name] = model
}

/**
 * @param {string} type
 * @returns {string}
 */
function getModelFromType(type) {
  return type_to_model[type]
}

/**
 * @param {string} model_name
 * @returns {import('.').OrmModelDefinition}
 */
function getModelFromName(model_name) {
  return model_name_to_model[model_name]
}

/**
 * @param {string} model_name
 * @returns {string}
 */
function getTypeFromModelName(model_name) {
  return model_name_to_type[model_name]
}

/**
 * @param {{ type: string }} data
 * @returns {import('.').OrmModelDefinition}
 */
function getModel(data) {
  const model_name = type_to_model[data.type]

  return model_name_to_model[model_name]
}

module.exports = {
  register,
  getModelFromType,
  getModelFromName,
  getTypeFromModelName,
  getModel,
}
