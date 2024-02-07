import AWS from 'aws-sdk';
import piexif from 'piexifjs';
import { getExifFromJpegFile, getExifMetadata, getBase64DataFromJpegFile } from "../services/exifService.mjs"
import { saveImageMetadata } from '../models/modelUtil.mjs';

const s3 = new AWS.S3({
    signatureVersion: 'v4'
});
const BUCKET_NAME = 'images-tfm2';

/**
 * A Lambda function that extracts EXIF metadata from an image in S3
 */
export const getMetadataHandler = async (event) => {

    // Parsea el body del evento si está disponible
    const requestBody = event.body ? JSON.parse(event.body) : {};

    const bucketName = requestBody.bucketName;
    const objectKey = requestBody.objectKey;
    try {
       const exif = await getExifFromJpegFile(bucketName, objectKey);        
        const exifData = getExifMetadata(exif);
        console.info('Extracted EXIF data:', exifData);

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Procesado correctamente', data: exifData }),
        };
    } catch (error) {
        console.error('Error processing image:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Error procesando la solicitud' }),
        };
    }
};

export const deleteMetadataHandler = async (event) => {

    // Parsea el body del evento si está disponible
    const requestBody = event.body ? JSON.parse(event.body) : {};

    console.log("Request:", event);

    const bucketName = requestBody.bucketName;
    const objectKey = requestBody.objectKey;

    try {
       const exif = await getExifFromJpegFile(bucketName, objectKey);        
        const exifData = getExifMetadata(exif); // Make sure this function returns the data

        const image = await getBase64DataFromJpegFile(bucketName, objectKey)
        const scrubbedImageData = piexif.remove(image);
        const fileBuffer = Buffer.from(scrubbedImageData, 'binary');

        console.info('Extracted EXIF here:', exif);
        console.info('Extracted EXIF data:', exifData);

        // Subir la imagen modificada a S3
        const newObjectKey = `processed/${objectKey}`;
        await s3.putObject({
            Bucket: bucketName,
            Key: newObjectKey,
            Body: fileBuffer,
            ContentType: 'image/jpeg',
        }).promise();

        return { 
            statusCode: 200, 
            body: JSON.stringify({ message: 'Imagen procesada correctamente' }) 
        };

    } catch (error) {
        console.error('Error deleting image metadata:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Error procesando la solicitud' }),
        };
    }
};

export const getImageHandler = async (event) => {

    // Parsea el body del evento si está disponible
    const requestBody = event.body ? JSON.parse(event.body) : {};

    console.log("Request:", event);

    const bucketName = requestBody.bucketName;
    const objectKey = requestBody.objectKey;

    try {
        // Configura las opciones para obtener la URL firmada
        const signedUrlExpireSeconds = 60 * 5; // URL válida por 5 minutos

        // Obtiene la URL firmada
        const url = s3.getSignedUrl('getObject', {
            Bucket: bucketName,
            Key: objectKey,
            Expires: signedUrlExpireSeconds
        });

        // Devuelve la URL firmada
        return {
            statusCode: 200,
            body: JSON.stringify({ downloadUrl: url })
        };
    } catch (error) {
        console.error('Error al generar la URL firmada: ', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Error al generar la URL de descarga' })
        };
    }
};

export const uploadImageHandler = async (event) => {
    const bucketName = BUCKET_NAME; // Reemplaza con tu bucket de S3
    const objectKey = event.queryStringParameters.key; // Clave del objeto (nombre del archivo) obtenida del query parameter
    console.log('object keyy', objectKey)

    try {
        // Configura las opciones para obtener la URL firmada para subir
        const url = s3.getSignedUrl('putObject', {
            Bucket: bucketName,
            Key: objectKey,
            Expires: 600 // Tiempo en segundos antes de que la URL expire
        });

        // Devuelve la URL firmada
        return {
            statusCode: 200,
            body: JSON.stringify({ uploadUrl: url })
        };
    } catch (error) {
        console.error(error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Error al generar la URL de carga' })
        };
    }
};