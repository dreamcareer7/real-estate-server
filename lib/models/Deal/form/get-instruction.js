module.exports = annotation => {
  const has = annotation.additional && annotation.additional.calculate && annotation.additional.calculate.JS
  if (!has)
    return false

  let assignment

  try {
    assignment = JSON.parse(annotation.additional.calculate.JS)
  } catch(e) {
    return false
  }

  return assignment
}
