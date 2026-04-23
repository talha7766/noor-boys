// metro.config.js
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

config.transformer.minifierConfig = {
    compress: {
        drop_console: true,
        drop_debugger: true,
        dead_code: true,
        passes: 3,
    },
    mangle: {
        toplevel: true,
        properties: {
            regex: /^_/,
        },
    },
    output: {
        comments: false,
    },
};

module.exports = config;
