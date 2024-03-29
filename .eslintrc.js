module.exports = {
  "env": {
    "es6": true,
    "node": true,
    "mocha": true,
    "jquery": true
  },
  "extends": "eslint:recommended",
  "parserOptions": {
    "sourceType": "module"
  },
  "rules": {
    "eol-last": ["error", "always"],
    "no-console": 0,
    "indent": [
      "error",
      "tab"
    ],
    "semi": [
      "error",
      "always"
    ]
  }
}
