// These just allow us to lookup for `User` given a `user` or vice versa with O(1) everywhere
const type_to_model = {}
const model_name_to_type = {}
const model_name_to_model = {}

const register = (type, model_name, model) => {
  type_to_model[type] = model_name
  model_name_to_type[model_name] = type
  model_name_to_model[model_name] = model
}

const getModelFromType = (type) => {
  return type_to_model[type]
}

const getModelFromName = (model_name) => {
  return model_name_to_model[model_name]
}

const getTypeFromModelName = (model_name) => {
  return model_name_to_type[model_name]
}

function getModel (data) {
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
