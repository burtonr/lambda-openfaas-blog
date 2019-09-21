"use strict"
const AWS = require('aws-sdk');
const fs = require('fs');

const shortDomain = 'https://checkthisnow.net/'
const tableName = "short-urls";
const indexName = "originalUrl-index";
let docClient;

module.exports = (event, context) => {
    let originalUrl = event.body.url || '';

    configureAWS();
    docClient = new AWS.DynamoDB.DocumentClient()

    checkExists(originalUrl, function (exist) {
        if (!exist) {
            createAndStorePath(originalUrl, context);
        } else {
            let shortenedURL = shortDomain + exist.token;
            context
                .status(200)
                .succeed({ url: shortenedURL });
        }
    });
}

function configureAWS() {
    let accessKeyId = fs.readFileSync("/var/openfaas/secrets/shorturl-dynamo-key").toString()
    let secretKey = fs.readFileSync("/var/openfaas/secrets/shorturl-dynamo-secret").toString()

    AWS.config.update({
        region: 'us-west-1',
        credentials: {
            accessKeyId: accessKeyId,
            secretAccessKey: secretKey
        }
    });
}

function checkExists(url, callback) {
    var params = {
        TableName: tableName,
        KeyConditionExpression: "originalUrl = :original",
        ExpressionAttributeValues: {
            ":original": url
        },
        IndexName: indexName
    };

    docClient.query(params, function (err, data) {
        if (err) {
            callback(null);
        } else {
            callback(data.Items[0]);
        }
    });
}

function createAndStorePath(originalUrl, context) {
    let path = generateToken();
    if (path == '') {
        context
            .status(500)
            .fail("Error generating short path");
    }

    let shortenedURL = shortDomain + path;
    storeURL(path, originalUrl, function (err) {
        if (err) {
            context
                .status(500)
                .fail("Error storing new short url");
        } else {
            context
                .status(201)
                .succeed({ url: shortenedURL });
        }
    });
}

function generateToken(path = '') {
    if (path.length === 7) {
        return path
    }

    let characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let position = Math.floor(Math.random() * characters.length)
    let character = characters.charAt(position)

    return generateToken(path + character)
}

function storeURL(token, originalUrl, callback) {
    let params = {
        TableName: tableName,
        Item: {
            "token": token,
            "originalUrl": originalUrl,
            "visits": 0
        }
    };

    docClient.put(params, function (err, data) {
        if (err) {
            console.error("Unable to store shortened URL. Error: ", JSON.stringify(err, null, 2));
            callback(err);
        } else {
            console.log("PUT new shortened URL as: ", JSON.stringify(params, null, 2));
            callback(null);
        }
    });
}
