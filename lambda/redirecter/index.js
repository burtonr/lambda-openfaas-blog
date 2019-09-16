var AWS = require("aws-sdk");

const tableName = "short-urls";

let docClient = new AWS.DynamoDB.DocumentClient({ endpoint: "http://localhost:8000" });

exports.handler = function (event, context, callback) {
    let token = event.pathParameters.token;

    var params = {
        TableName: tableName,
        Key: {
            "token": token,
        }
    };

    docClient.get(params, function (err, data) {
        if (err) {
            console.error("Unable to read item. Error JSON:", JSON.stringify(err, null, 2));
            callback(null, {status: 500});
        } else {
            if (data.Item && data.Item.visits >= 0) {
                updateCount(token, data.Item.visits);
                callback(null, {status: 301, location: data.originalUrl});
            } else {
                console.log("No records found for token: ", token);
                callback(null, {status: 404});
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
