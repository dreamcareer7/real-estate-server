module.exports = annotation => {
  const has = annotation.actions?.Calculate
  if (!has)
    return false

  let assignment

  try {
    assignment = JSON.parse(annotation.actions.Calculate)
  } catch(e) {
    return false
  }

  return assignment
}
