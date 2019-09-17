const AWS = require('aws-sdk');

const shortDomain = 'https://checkthisnow.net/'
const tableName = "short-urls";
const indexName = "originalUrl-index";
let docClient = new AWS.DynamoDB.DocumentClient();

exports.handler = function (event, context, callback) {
    let originalUrl = JSON.parse(event.body).url || '';

    checkExists(originalUrl, function (exist) {
        if (!exist) {
            createAndStorePath(originalUrl, callback);
        } else {
            let shortenedURL = shortDomain + exist.token;
            let response = {
                isBase64Encoded: false,
                statusCode: 200,
                headers: {},
                body: JSON.stringify({
                    url: shortenedURL
                })
            };
            callback(null, response);
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

function createAndStorePath(originalUrl, callback) {
    let response = {
        isBase64Encoded: false,
        statusCode: 201,
        headers: {},
        body: "{}"
    };

    let path = generateToken();
    if (path == '') {
        response.statusCode = 500;
        response.body = JSON.stringify({
            url: "",
            error: "Error generating short path"
        });
        callback(new Error("Error generating short path"), response);
    }

    let shortenedURL = shortDomain + path;
    storeURL(path, originalUrl, function (err) {
        if (err) {
            response.statusCode = 500;
            response.body = JSON.stringify({
                url: "",
                error: err
            });
            callback(new Error("Error storing new short url: ", response));
        } else {
            response.body = JSON.stringify({
                url: shortenedURL
            });
            callback(null, response);
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