/**
 * @param {import('./types').ShowingInput} showing
 */
function validate(showing) {
  if (showing.roles.length < 1) {
    throw Error.Validation('Showing must have at least one role.')
  }

  if (showing.availabilities.length < 1) {
    throw Error.Validation('Showing must have at least one availability rule.')
  }
}

module.exports = {
  validate
}
