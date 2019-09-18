var AWS = require("aws-sdk");

const tableName = "short-urls";

let docClient = new AWS.DynamoDB.DocumentClient();

exports.handler = function (event, context, callback) {
    let token = event.token;

    let response = {
        isBase64Encoded: false,
        statusCode: 200,
        headers: {},
        body: "{}"
    };

    var params = {
        TableName: tableName,
        Key: {
            "token": token,
        }
    };

    docClient.get(params, function (err, data) {
        if (err) {
            console.error("Unable to read item. Error JSON:", JSON.stringify(err, null, 2));
            response.statusCode = 500;
            response.body = JSON.stringify({
                input: token,
                error: err
            });
            callback(null, response);
        } else {
            if (data.Item && data.Item.visits >= 0) {
                updateCount(token, data.Item.visits);
                response.statusCode = 301;
                response.body = JSON.stringify({
                    destinationUrl: data.Item.originalUrl
                });
                callback(null, response);
            } else {
                console.log("No records found for token: ", token);
                response.statusCode = 404;
                callback(null, response);
            }
        }
    });
}

function updateCount(token, visits) {
    visits++;

    let params = {
        TableName: tableName,
        Key: {
            "token": token
        },
        UpdateExpression: "SET visits = :num",
        ExpressionAttributeValues: {
            ":num": visits
        }
    };

    docClient.update(params, function (err, data) {
        if (err) {
            console.error(`Unable to update visits for token ${token}. Error: `, JSON.stringify(err, null, 2));
        }
    })
}
