const globals = [
  'BigInt',
]

const global_object = {}
globals.forEach(var_name => {
  global_object[var_name] = true
})

module.exports = {
  'globals': global_object,
  'env': {
    'es6': true,
    'node': true
  },
  'parserOptions': {
    // 'sourceType': 'module',
    'ecmaVersion': 2021
  },
  'extends': 'eslint:recommended',
  'rules': {
    'indent': [
      'error',
      2,
      {'SwitchCase': 1}
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
    'prefer-const': 'error',
    'no-unused-vars': [
      'error',
      {'vars': 'all', 'args': 'none'}
    ],
    'no-invalid-this': 'off',
    'no-prototype-builtins': 'off',
    'require-atomic-updates': 'off',
    'no-async-promise-executor': 'warn',
    'no-console': 'off',
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
      'off'
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
    ],
    'no-implicit-globals': [
      'error'
    ],
    'yoda': [
      'error'
    ],
    'no-with': [
      'error'
    ],
    'no-void': [
      'error'
    ],
    'no-useless-call': [
      'error'
    ],
    'no-unused-labels': [
      'error'
    ],
    // 'no-unused-expressions': [
    //   'error'
    // ],
    'no-unmodified-loop-condition': [
      'error'
    ],
    'no-sequences': [
      'error'
    ],
    'no-self-compare': [
      'error'
    ],
    'no-self-assign': [
      'error'
    ],
    'no-return-assign': [
      'error'
    ],
    'no-redeclare': [
      'error'
    ],
    'no-proto': [
      'error'
    ],
    'no-new': [
      'error'
    ],
    'no-new-wrappers': [
      'error'
    ],
    'no-new-func': [
      'error'
    ],
    'no-implied-eval': [
      'error'
    ],
    'callback-return': [
      'error'
    ],
    'handle-callback-err': [
      'error'
    ]
  }
}
