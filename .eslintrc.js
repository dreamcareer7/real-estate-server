const globals = [
  'Error',
  'Orm',
  'Job',
  'Template',
  'Address',
  'User',
  'CompactUser',
  'Session',
  'Client',
  'Token',
  'Property',
  'Listing',
  'CompactListing',
  'Room',
  'Recommendation',
  'Url',
  'Contact',
  'Alert',
  'S3',
  'Email',
  'SES',
  'Mailgun',
  'MLSArea',
  'SMS',
  'Invitation',
  'Admin',
  'Crypto',
  'ObjectUtil',
  'Verification',
  'EmailVerification',
  'PhoneVerification',
  'Branch',
  'Tag',
  'Photo',
  'MLSJob',
  'Agent',
  'Metric',
  'Socket',
  'OpenHouse',
  'Transaction',
  'Idate',
  'Task',
  'Attachment',
  'Office',
  'PropertyUnit',
  'PropertyRoom',
  'Note',
  'CMA',
  'Brand',
  'School',
  'Intercom',
  'Google',
  'Notification',
  'Message',
  'Slack',
  'Facebook',
  'SocketServer',
  'Twilio',
  'Poster'
]

const global_object = {}
globals.forEach(var_name => {
  global_object[var_name] = true
})

module.exports = function (app) {
  for (var i in files)
    require(files[i])
}
module.exports = {
  'globals': global_object,
  'env': {
    'es6': true,
    'node': true
  },
  'extends': 'eslint:recommended',
  'rules': {
    'indent': [
      'error',
      2
    ],
    'linebreak-style': [
      'error',
      'unix'
    ],
    'quotes': [
      'error',
      'single'
    ],
    'no-var': 'error',
    'semi': [
      'error',
      'never'
    ],
    'no-extra-semi': 'error',
    'prefer-const': 'error',
    'no-unused-vars': [
      'error',
      {'vars': 'all', 'args': 'none'}
    ],
    'no-console': 'off',
    'no-empty': [
      'error',
      {'allowEmptyCatch':true}
    ],
    'key-spacing': [
      'error'
    ],
    'space-infix-ops': [
      'error'
    ],
    'no-cond-assign': [
      'error'
    ],
    'no-dupe-args': [
      'error'
    ],
    'no-dupe-keys': [
      'error'
    ],
    'no-duplicate-case': [
      'error'
    ],
    'no-empty-character-class': [
      'error'
    ],
    'no-empty': [
      'error'
    ],
    'no-extra-boolean-cast': [
      'error'
    ],
    'no-extra-semi': [
      'error'
    ],
    'no-obj-calls': [
      'error'
    ],
    'no-unexpected-multiline': [
      'error'
    ],
    'no-unreachable': [
      'error'
    ],
    'no-unsafe-negation': [
      'error'
    ],
    'use-isnan': [
      'error'
    ],
    'valid-typeof': [
      'error'
    ],
    'default-case': [
      'error'
    ],
    'eqeqeq': [
      'error'
    ],
    'no-alert': [
      'error'
    ],
    'no-caller': [
      'error'
    ],
    'no-case-declarations': [
      'error'
    ],
    'no-else-return': [
      'error'
    ],
    'no-eq-null': [
      'error'
    ],
    'no-eval': [
      'error'
    ],
    'no-extra-bind': [
      'error'
    ],
    'no-extra-label': [
      'error'
    ],
    'no-fallthrough': [
      'error'
    ],
    'no-floating-decimal': [
      'error'
    ],
    'no-global-assign': [
      'error'
    ],
    'no-implicit-coercion': [
      'error'
    ]
  }
}
