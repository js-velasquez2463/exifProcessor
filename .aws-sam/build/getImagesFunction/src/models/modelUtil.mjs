const BUCKET_NAME = 'images-tfm2';
import mysql from 'mysql';

const connection = mysql.createConnection({
    host: process.env.RDS_HOSTNAME,
    user: process.env.RDS_USERNAME,
    password: process.env.RDS_PASSWORD,
    port: process.env.RDS_PORT,
    database: process.env.RDS_DBNAME
});

export const saveImageMetadata = async (imageName, userId, metadata) => {
    // Guardar la información en la base de datos
    const query = 'INSERT INTO images (image_name, user_id, s3_url, user_metadata) VALUES (?, ?, ?, ?)';
    const s3Url = `https://${BUCKET_NAME}.s3.amazonaws.com/${imageName}`;
    const queryParams = [imageName, userId, s3Url, JSON.stringify(metadata)];
    const result = await runQuery(query, queryParams);
    console.log('result querry', result);
    return result;
}

export const getImages = async (userId) => {
    const queryParams = [userId];
    const query = 'SELECT * from images WHERE user_id = ?';
    const result = await runQuery(query, queryParams);
    console.log('result querry', result);
    return result;
}

export const updateImageMetadata = async (imageName, userId, metadata) => {
    // Guardar la información en la base de datos
    const query = 'UPDATE images SET user_metadata = ? WHERE user_id = ? AND image_name = ?';
    const queryParams = [JSON.stringify(metadata), userId, imageName];
    const result = await runQuery(query, queryParams);
    console.log('result querry', result);
    return result;
}

export const updateImageEncryptedMetadata = async (imageName, userId, metadata) => {
    // Guardar la información en la base de datos
    const query = 'UPDATE images SET encrypted_metadata = ? WHERE user_id = ? AND image_name = ?';
    const queryParams = [JSON.stringify(metadata), userId, imageName];
    const result = await runQuery(query, queryParams);
    console.log('result querry', result);
    return result;
}

export const createImage = async (imageName, userId) => {
    // Guardar la información en la base de datos
    const query = 'INSERT INTO images (image_name, user_id, s3_url) VALUES (?, ?, ?)';
    const s3Url = `https://${BUCKET_NAME}.s3.amazonaws.com/${imageName}`;
    const queryParams = [imageName, userId, s3Url];
    const result = await runQuery(query, queryParams);
    console.log('result querry', result);
    return result;
}


const runQuery = (query, queryParams) => {
    return new Promise((resolve, reject) => {
        connection.query(query, queryParams, function (err, result) {
            if (err) {
                reject(err);
            } else {
                resolve(result);
            }
        });
    });
};