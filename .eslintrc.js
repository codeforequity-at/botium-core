module.exports = {
    "extends": ["standard", "plugin:mocha/recommended"],
    "env": {
        "mocha": true
    },
    rules: {
        'mocha/no-setup-in-describe': 'warn',
    },
}
