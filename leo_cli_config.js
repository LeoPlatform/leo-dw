'use strict';
let fs = require("fs");
let path = require("path");
let merge = require("lodash.merge")
let externalConfigPath = path.resolve(process.env.externalConfigPath || ".", "../config/dw/leo_cli_config.js");
let externalConfig = {};
if (fs.existsSync(externalConfigPath)) {
    externalConfig = require(externalConfigPath);
}

module.exports = merge({
    publish: [{
        leoaws: {
            profile: 'default',
            region: 'us-west-2'
        },
        public: false,
        staticAssets: "s3://YOUR_S3_BUCKET_FOR_STATIC_ASSETS/leo_dw"
    }],
    deploy: {
        dev: {
            stack: 'DevDw',
            parameters: {
                AddRedshift: 'yes',
                AuroraType: 'None',
                CognitoId: 'YOUR_COGNITO_POOL_ID',
                CustomDBEndpoint: '',
                CustomDBType: 'None',
                CustomFavicon: '',
                CustomJS: '',
                CustomCSS: '',
                DBUsername: 'YOUR_DW_USER',
                DBPassword: 'YOUR_DW_PASSWORD',
                IngestSourceQueue: 'dw.load',
                leoauth: 'DevAuth',
                leosdk: 'DevBus',
                RedshiftNodeType: 'dc2.large',
                RedshiftNumberOfNodes: 1
            }
        }
    },
    test: {
        personas: {
            default: {
                identity: {
                    sourceIp: "127.0.0.1"
                }
            }
        },
        defaultPersona: 'default'
    }
}, externalConfig);
