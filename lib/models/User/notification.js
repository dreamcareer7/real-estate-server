
/**
 * @param {IUserBase} user
 * @returns {boolean}
 */
const shouldTryEmail = function(user) {
  // We don't have an email for this user
  if (!user.email) return false

  // Don't try sending an actual email to a fake email address
  if (user.fake_email) return false

  return true
}

/**
 * @param {IUserBase} user
 * @returns {boolean}
 */
const shouldTrySMS = function(user) {
  // Dont send SMS. We're going to send an email.
  if (user.email && !user.fake_email) return false

  // Dont try sending an SMS. We dont have his number.
  if (!user.phone_number) return false

  return true
}

module.exports = {
  shouldTryEmail,
  shouldTrySMS,
}
