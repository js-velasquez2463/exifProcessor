import AWS from 'aws-sdk';
import piexif from 'piexifjs';
import { getExifFromJpegFile } from "../services/exifService.mjs"

const s3 = new AWS.S3();

/**
 * A Lambda function that extracts EXIF metadata from an image in S3
 */
export const helloFromLambdaHandler = async (event) => {
    // Assumes that the bucket and object keys are provided in the event

    // Parsea el body del evento si está disponible
    const requestBody = event.body ? JSON.parse(event.body) : {};

    console.log("Request:", event);

    const bucketName = requestBody.bucketName;
    const objectKey = requestBody.objectKey;
    try {
       console.log("Request, ", getExifFromJpegFile);
       const exif = await getExifFromJpegFile(bucketName, objectKey);        
        const exifData = debugExif(exif); // Make sure this function returns the data

        console.info('Extracted EXIF here:', exif);
        console.info('Extracted EXIF data:', exifData);

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Procesado correctamente', data: exifData }),
        };
    } catch (error) {
        console.error('Error processing image:', error);
        //throw new Error(`Error processing image: ${error.message}`);
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
        const exifData = debugExif(exif); // Make sure this function returns the data

        const image = await getBase64DataFromJpegFile(bucketName, objectKey)
        const scrubbedImageData = piexif.remove(image);
        const fileBuffer = Buffer.from(scrubbedImageData, 'binary');

        console.info('Extracted EXIF here:', exif);
        console.info('Extracted EXIF data:', exifData);

        // Subir la imagen modificada a S3
        const newObjectKey = `processed/${objectKey}`; // Modificar según tus necesidades
        await s3.putObject({
            Bucket: bucketName,
            Key: newObjectKey,
            Body: fileBuffer,
            ContentType: 'image/jpeg', // Asegúrate de ajustar según el tipo de archivo
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

const getBase64DataFromJpegFile = async (bucketName, objectKey) => {
    const params = {
        Bucket: bucketName,
        Key: objectKey,
    };
    const data = await s3.getObject(params).promise();
    return data.Body.toString('binary');
}

//const getExifFromJpegFile = async(bucketName, objectKey) => piexif.load(await getBase64DataFromJpegFile(bucketName, objectKey));

function debugExif(exif) {
     // Function to parse and return EXIF data
    const data = {};
    for (const ifd in exif) {
        if (ifd == 'thumbnail') {
            const thumbnailData = exif[ifd] === null ? "null" : exif[ifd];
            data['thumbnail'] = thumbnailData;
            console.debug(`- thumbnail: ${thumbnailData}`);
        } else {
            console.debug(`- ${ifd}`);
            for (const tag in exif[ifd]) {
                data[piexif.TAGS[ifd][tag]['name']] = exif[ifd][tag];
                console.debug(`    - ${piexif.TAGS[ifd][tag]['name']}: ${exif[ifd][tag]}`);
            }
        }
    }
    console.log("metadata: ", data);
    return data;
}