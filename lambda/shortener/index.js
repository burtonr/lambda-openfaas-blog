const AWS = require('aws-sdk');

const originalUrl = "https://something.com/a-really-cool-site-to-share/old";
const shortDomain = 'https://checkthisnow.net/'
const tableName = "short-urls";
const indexName = "originalUrl-index";
let docClient = new AWS.DynamoDB.DocumentClient();

exports.handler = function (event, context, callback) {
    let originalUrl = JSON.parse(event.body).url || '';

    checkExists(originalUrl, function (exist) {
        if (!exist) {
            createAndStorePath();
        } else {
            let shortenedURL = shortDomain + exist.shortUrl;
            callback(null, { status: 204, url: shortenedURL });
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

function createAndStorePath() {
    let path = generateToken();
    if (path == '') {
        callback(new Error("Error generating short path"));
        return;
    }

    let shortenedURL = shortDomain + path;
    storeURL(path, originalUrl, function (err) {
        if (err) {
            callback(new Error("Error storing new short url: ", err));
        } else {
            callback(null, { status: 204, url: shortenedURL });
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

function storeURL(shortUrl, longUrl, callback) {
    let params = {
        TableName: tableName,
        Item: {
            "shortUrl": shortUrl,
            "originalUrl": longUrl,
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