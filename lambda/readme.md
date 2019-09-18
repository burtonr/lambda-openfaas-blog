# Lambda URL Shortener
This is the code used for the Lambda - OpenFaaS blog post.

The function(s) generate a token used to create a short(er) URL, and redirect to the original website when the short URL is used.

## Shortener
This function accepts a `POST` request with the original URL in the body. The function first checks if the short token has already been generated. If not, a token is created and stored with the original URL as well as a count of the number of times the short URL was used to visit the original URL.

The response includes the short URL in JSON format.

## Redirector
This function is executed when a `GET` request is sent to one of the short URLs (ie from a browser).

The function pulls the original URL from the DynamoDB, updates the `visits` count, and responds with a `301: Moved Permanently` header to redirect the browser the full URL.

## Steps
In order for these functions to work properly, the following steps must be completed:

- Create an AWS account
- Create a new DynamoDB table
    - Table name: `short-urls`
    - Primary partition key: `token`
    - Secondary index: `originalUrl-index`
        - Partition key: `originalUrl`
- Create IAM policy to access DynamoDB (see below)
- Create IAM role with the created policy
    - Role name: `lambda-short-url`
- Zip both functions
    - `zip -r <function name>.zip .`
- Use the AWS CLI to upload/publish the function(s)
    - `aws lambda create-function --function-name <function name> --zip-file fileb://<function name>.zip --handler index.handler --runtime nodejs10.x --timeout 30 --memory-size 1024 --role arn:aws:iam::<account number>:role/lambda-short-url`
- Create API Gateway to invoke the function
- Create method "POST" for `shortener` function
    - Select "Integration type" as "Lambda Function"
    - Check the box for "Use Lambda Proxy integration"
    - Select the appropriate region
    - Enter the function name
    - Leave the "Use Default Timeout" box checked
- "Create Resource" for `redirecter` function
    - Enter `token` as the "Resource Name"
    - Use `{token}` as the "Resource Path"
    - Create method "GET" for resource
        - In the `Method Request`, select "Request Paths"
            - Enter `token` in the "Name" field
        - In the `Integration Request`, select "Mapping Templates"
            - Enter `application/json` in the "Content-Type"
            - Copy the following into the template: `{ "token": "$input.params('token')" }`
            - This will map the `token` path parameter to the `event.token` variable inside the Lambda function
        - In the `Method Response`, delete the `200` status (added by default). Click "Add Response", enter `301` for the status code
            - In the "Response Headers", enter `Location` in the "Name" field
        - In the `Integration Response`, delete the `200` status (added by default). 
            - Click the "Add integration response", select `301` for the "Method response status"
            - Select "Header Mappings"
                - Enter `Location` as the "Response Header"
                - Enter `integration.response.body.destinationUrl` for the "Mapping value"
                - This will take the response body `destinationUrl` value and return it as the `Location` header from the API Gateway



IAM Policy for DynamoDB
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "VisualEditor0",
            "Effect": "Allow",
            "Action": [
                "dynamodb:PutItem",
                "dynamodb:GetItem",
                "dynamodb:Query",
                "dynamodb:UpdateItem"
            ],
            "Resource": [
                "arn:aws:dynamodb:*:*:table/*/index/*",
                "arn:aws:dynamodb:us-west-1:xxxxxxxxxxxx:table/short-urls"
            ]
        }
    ]
}
```