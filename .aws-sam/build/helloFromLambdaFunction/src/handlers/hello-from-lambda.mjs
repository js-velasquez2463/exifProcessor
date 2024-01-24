import AWS from 'aws-sdk';
import piexif from 'piexifjs';

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

    //const bucketName = event.bucketName;
    //const objectKey = event.objectKey;  

    try {
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

const getBase64DataFromJpegFile = async (bucketName, objectKey) => {
    const params = {
        Bucket: bucketName,
        Key: objectKey,
    };
    const data = await s3.getObject(params).promise();
    return data.Body.toString('binary');
}

const getExifFromJpegFile = async(bucketName, objectKey) => piexif.load(await getBase64DataFromJpegFile(bucketName, objectKey));

function debugExif(exif) {
     // Function to parse and return EXIF data
    const data = {};
    for (const ifd in exif) {
        if (ifd == 'thumbnail') {
            const thumbnailData = exif[ifd] === null ? "null" : exif[ifd];
            data['thumbnail'] = thumbnailData;
            console.log(`- thumbnail: ${thumbnailData}`);
        } else {
            console.log(`- ${ifd}`);
            for (const tag in exif[ifd]) {
                data[piexif.TAGS[ifd][tag]['name']] = exif[ifd][tag];
                console.log(`    - ${piexif.TAGS[ifd][tag]['name']}: ${exif[ifd][tag]}`);
            }
        }
    }
    console.log("metadata: ", data);
    return data;
}