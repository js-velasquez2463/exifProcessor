import AWS from 'aws-sdk';
import jwt from 'jsonwebtoken';
import mysql from 'mysql';
import { getMetadataFromS3File } from "../services/exifService.mjs"
import { saveImageMetadata, createImage, updateImageMetadata, updateImageEncryptedMetadata, getImages } from '../models/modelUtil.mjs';
import { getStringifyResponse } from '../services/responseService.mjs';
import { encryptText } from '../services/encryptionService.mjs';
import { randomBytes } from 'crypto';

const AUTH_METHOD = 'USER_PASSWORD_AUTH';

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

// Configurar AWS
const cognito = new AWS.CognitoIdentityServiceProvider({apiVersion: '2016-04-18'});

// Función para autenticar al usuario utilizando Amazon Cognito
const authenticateUser = async (username, password) => {
    const params = {
        AuthFlow: AUTH_METHOD,
        ClientId: '6c21m53r6qtgbefj7lm4i06o4j',
        AuthParameters: {
            USERNAME: username,
            PASSWORD: password
        }
    };

    try {
        console.log('llego requestt', username, password);
        const data = await cognito.initiateAuth(params).promise();
        console.log('repsondioo requestt', data);
        const accessToken = data.AuthenticationResult.AccessToken;
        const idToken = data.AuthenticationResult.IdToken;
        console.log('dataaa', data)

        return data.AuthenticationResult;
    } catch (error) {
        console.error('Error during authentication:', error);
        throw error;
    }
};

export const verifyTokenHandler = async (event) => {
    const token = event.authorizationToken;
    try {
        // Supongamos que 'verifyToken' es una función que valida el token de Cognito
        const userClaims = await verifyToken(token);
        
        // Si el token es válido, generamos una política IAM que permite el acceso
        return generatePolicy('user', 'Allow', event.methodArn);
    } catch (error) {
        // Si hay un error (por ejemplo, token inválido), niega el acceso
        return generatePolicy('user', 'Deny', event.methodArn);
    }
};

const generatePolicy = (principalId, effect, resource) => {
    const authResponse = {};
    authResponse.principalId = principalId;
    if (effect && resource) {
        const policyDocument = {};
        policyDocument.Version = '2012-10-17';
        policyDocument.Statement = [];
        const statementOne = {};
        statementOne.Action = 'execute-api:Invoke';
        statementOne.Effect = effect;
        statementOne.Resource = resource;
        policyDocument.Statement[0] = statementOne;
        authResponse.policyDocument = policyDocument;
    }
    return authResponse;
}

// Función para verificar si un token JWT es válido
const verifyToken2 = (token) => {
    try {
        // Verificar la firma del token JWT (en este caso, no es necesario especificar una clave secreta)
        const decodedToken = jwt.verify(token, { algorithms: ['RS256'] });

        // Verificar si el token JWT ha expirado
        const currentTimestamp = Math.floor(Date.now() / 1000);
        if (decodedToken.exp < currentTimestamp) {
            return { valid: false, reason: 'Token has expired' };
        }

        // El token JWT es válido
        return { valid: true, decodedToken };
    } catch (error) {
        // Error al verificar el token JWT
        return { valid: false, reason: 'Invalid token' };
    }
};

// Handler de la lambda para verificar un token JWT
export const verifyTokenHandler2 = async (event) => {
    try {
        const token = event.headers.Authorization.split(' ')[1]; // Extraer el token JWT del encabezado de autorización

        // Verificar si el token JWT es válido
        const verificationResult = verifyToken(token);

        if (verificationResult.valid) {
            // Token JWT válido
            return {
                statusCode: 200,
                body: JSON.stringify({ message: 'Token is valid', token: verificationResult.decodedToken })
            };
        } else {
            // Token JWT inválido
            return {
                statusCode: 401,
                body: JSON.stringify({ error: verificationResult.reason })
            };
        }
    } catch (error) {
        console.error('Error verifying token:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Error verifying token' })
        };
    }
};

const changePassword = async (username, newPassword, session) => {
    const params = {
        ChallengeName: 'NEW_PASSWORD_REQUIRED',
        ClientId: 'YOUR_CLIENT_ID',
        ChallengeResponses: {
            USERNAME: username,
            NEW_PASSWORD: newPassword
        },
        Session: session
    };

    try {
        const data = await cognito.respondToAuthChallenge(params).promise();
        console.log('Password changed successfully:', data);
        return data;
    } catch (error) {
        console.error('Error changing password:', error);
        throw error;
    }
};

const loginChangePassword = async (username, password, newPassword) => {
    
    try {
        const params = {
            AuthFlow: AUTH_METHOD,
            ClientId: '6c21m53r6qtgbefj7lm4i06o4j',
            AuthParameters: {
                USERNAME: username,
                PASSWORD: password
            }
        };
        console.log('llego requestt', username, password);
        const data = await cognito.initiateAuth(params).promise();
        console.log('repsondioo requestt', data, data.Session);
        const params2 = {
            ChallengeName: 'NEW_PASSWORD_REQUIRED',
            ClientId: '6c21m53r6qtgbefj7lm4i06o4j',
            ChallengeResponses: {
                USERNAME: username,
                NEW_PASSWORD: newPassword
            },
            Session: data.Session
        };

        const data2 = await cognito.respondToAuthChallenge(params2).promise();
        console.log('Password changed successfully:', data2);
        return data2;
    } catch (error) {
        console.error('Error changing password:', error);
        throw error;
    }
};


// Handler para la solicitud de inicio de sesión
export const loginHandler = async (event) => {
    try {
        // Asumiendo que el evento es un string JSON con campos "username" y "password"
        const requestBody = JSON.parse(event.body);
        const { username, password } = requestBody;
        console.log('llego requestt acaa', username, password);
        // Autenticar al usuario y generar el token JWT
        const jwtToken = await authenticateUser(username, password);

        // Retornar el token JWT en la respuesta
        return getStringifyResponse({
            statusCode: 200,
            body: { token: jwtToken }
        });
    } catch (error) {
        console.error('Error during login:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Error during login' })
        };
    }
};

// Handler para la solicitud de inicio de sesión
export const changePasswordHandler = async (event) => {
    try {
        // Asumiendo que el evento es un string JSON con campos "username" y "password"
        const requestBody = JSON.parse(event.body);
        const { username, newPassword, session } = requestBody;
        console.log('llego requestt acaa', username, password);
        // Autenticar al usuario y generar el token JWT
        const jwtToken = await changePassword(username, newPassword, session);

        // Retornar el token JWT en la respuesta
        return {
            statusCode: 200,
            body: JSON.stringify({ token: jwtToken })
        };
    } catch (error) {
        console.error('Error during login:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Error during login' })
        };
    }
};

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
        return getStringifyResponse({
            statusCode: 200,
            body: { message: 'Query executed successfully', result }
        });
    } catch (error) {
        console.error('Error executing query: ', error);
        return getStringifyResponse({
            statusCode: 500,
            body: { error: 'Error executing query' }
        });
    }
};

export const processImageMetadataHandler = async (event) => {
    try {
        // Asumiendo que el evento es un string JSON con un campo "query"
        const requestBody = event.body ? JSON.parse(event.body) : {};

        console.log("Request:", requestBody);

        const objectKey = requestBody.objectKey;
        const userId = requestBody.userId;

        const metadata = await getMetadataFromS3File(BUCKET_NAME, objectKey);
        const result = await updateImageMetadata(objectKey, userId, {metadata});
        console.log('Consiguio el exif')
        return getStringifyResponse({
            statusCode: 200,
            body: { message: 'Query executed successfully', result, metadata }
        });
    } catch (error) {
        console.error('Error executing query: ', error);
        return getStringifyResponse({
            statusCode: 500,
            body: { error: 'Error executing query' }
        });
    }
};

export const encryptImageMetadataHandler = async (event) => {
    try {
        const requestBody = event.body ? JSON.parse(event.body) : {};
        console.log("Request:", requestBody);

        const objectKey = requestBody.objectKey;
        const encryptionKey = process.env.ENCRYPTION_KEY;
        const userId = requestBody.userId;
        
        console.log('Encryption Key:', encryptionKey);

        const metadata = await getMetadataFromS3File(BUCKET_NAME, objectKey);
        
        // Encripta la metadata
        const encryptedMetadata = encryptText(JSON.stringify(metadata), encryptionKey);

        const result = await updateImageEncryptedMetadata(objectKey, userId, { metadata: encryptedMetadata });
        console.log('Metadata obtenida y encriptada');
        
        return getStringifyResponse({
            statusCode: 200,
            body: { message: 'Query executed successfully', metadata: encryptedMetadata, encryptionKey }
        });
    } catch (error) {
        console.error('Error executing query: ', error);
        return getStringifyResponse({
            statusCode: 500,
            body: { error: 'Error executing query' }
        });
    }
};

export const createImageS3Handler = async (event) => {
    try {
        // Asumiendo que el evento es un string JSON con un campo "query"
        const requestBody = event.body ? JSON.parse(event.body) : {};

        console.log("Request:", requestBody);
        const objectKey = requestBody.objectKey;
        const result = await createImage(objectKey, requestBody.userId);
        console.log('Consiguio el exif')
        return getStringifyResponse({
            statusCode: 200,
            body: { message: 'Query executed successfully', result }
        });
    } catch (error) {
        console.error('Error executing query: ', error);
        return getStringifyResponse({
            statusCode: 500,
            body: { error: 'Error executing query' }
        });
    }
};

export const getImagesHandler = async (event) => {
    try {
        // Asumiendo que el evento es un string JSON con un campo "query"
        const queryParams = event.queryStringParameters || {};

        console.log("Query Params:", queryParams);
        const userId = queryParams.userId; // Obtiene userId de los parámetros de la consulta
        const result = await getImages(userId);
        console.log('Imagenes:', result)
        return getStringifyResponse({
            statusCode: 200,
            body: { message: 'Query executed successfully', result }
        });
    } catch (error) {
        console.error('Error executing query: ', error);
        return getStringifyResponse({
            statusCode: 500,
            body: { error: 'Error executing query' }
        });
    }
};
