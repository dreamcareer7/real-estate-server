const publicize = function(model) {
  if(model.object_sa) {
    model.object = model.object_sa
  }

  delete model.object_class
  delete model.object_sa

  return model
}

module.exports = {
  publicize
}
