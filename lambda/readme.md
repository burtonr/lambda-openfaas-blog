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