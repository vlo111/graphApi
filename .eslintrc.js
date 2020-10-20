module.exports = {
  env: {
    browser: true,
    commonjs: true,
    es6: true,
  },
  parser: "babel-eslint",
  ecmaFeatures: {
    "modules": true,
    "arrowFunctions": true,
    "classes": true
  },
  extends: [
    'airbnb-base',
  ],
  globals: {
    Atomics: 'readonly',
    SharedArrayBuffer: 'readonly',
    __: 'readonly',
    __n: 'readonly',
  },
  parserOptions: {
    ecmaVersion: 2018,
  },
  rules: {
    radix: [0],
    'no-use-before-define': ["error", { "functions": false }],
    'no-plusplus': [0],
    'no-param-reassign': [0],
    'global-require': [0],
    'no-restricted-syntax': [0],
    'no-await-in-loop': [0],
    'no-underscore-dangle': [0],
    'no-console': [0],
    'no-continue': [0],
    'import/no-dynamic-require': [0],
    'import/no-cycle': [0],
  },
};
