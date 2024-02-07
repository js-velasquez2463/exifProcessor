import AWS from 'aws-sdk';
import mysql from 'mysql';
import { getMetadataFromS3File } from "../services/exifService.mjs"
import { insertImage } from '../models/modelUtil.mjs';

const s3 = new AWS.S3({
    signatureVersion: 'v4'
});
const BUCKET_NAME = 'images-tfm2';


const connection = mysql.createConnection({
    host: process.env.RDS_HOSTNAME,
    user: process.env.RDS_USERNAME,
    password: process.env.RDS_PASSWORD,
    port: process.env.RDS_PORT,
    database: process.env.RDS_DBNAME
});

export const createDatabaseHandler = async (event) => {
    connection.query("CREATE DATABASE test", function (err, result) {
        if (err) throw err;
        console.log("Database created");
    });
    return "Database Created"
};

const runQuery = (query) => {
    return new Promise((resolve, reject) => {
        connection.query(query, function (err, result) {
            if (err) {
                reject(err);
            } else {
                resolve(result);
            }
        });
    });
};


export const queryDatabaseHandler = async (event) => {
    try {
        // Asumiendo que el evento es un string JSON con un campo "query"
        console.log("query", event.body)
        const requestBody = JSON.parse(event.body);

        const sqlQuery = requestBody.query;
        const result = await runQuery(sqlQuery);
        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Query executed successfully', result })
        };
    } catch (error) {
        console.error('Error executing query: ', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Error executing query' })
        };
    }
};

export const uploadImageS3Handler = async (event) => {
    try {
        // Asumiendo que el evento es un string JSON con un campo "query"
        const requestBody = event.body ? JSON.parse(event.body) : {};

        console.log("Request:", requestBody);

        const objectKey = requestBody.objectKey;

        const metadata = await getMetadataFromS3File(BUCKET_NAME, objectKey);
        const result = await insertImage(objectKey, 'test12345', metadata);
        console.log('Consiguio el exif')
        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Query executed successfully', result })
        };
    } catch (error) {
        console.error('Error executing query: ', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Error executing query' })
        };
    }
};
