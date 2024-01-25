import AWS from 'aws-sdk';
import piexif from 'piexifjs';
const s3 = new AWS.S3();

export const getBase64DataFromJpegFile = async (bucketName, objectKey) => {
    const params = {
        Bucket: bucketName,
        Key: objectKey,
    };
    const data = await s3.getObject(params).promise();
    return data.Body.toString('binary');
}


//TODO: Seguir haciendo endpoint de eliminar metadata
export function deleteMetadata() {
    // Create a “scrubbed” copy of the original hotel photo and save it
    const hotelImageData = getBase64DataFromJpegFile('./images/hotel.jpg');
    const scrubbedHotelImageData = piexif.remove(hotelImageData);
    fileBuffer = Buffer.from(scrubbedHotelImageData, 'binary');
    //fs.writeFileSync('./images/hotel scrubbed.jpg', fileBuffer);

    debugExif(getExifFromJpegFile());
}

export const getExifFromJpegFile = async(bucketName, objectKey) => piexif.load(await getBase64DataFromJpegFile(bucketName, objectKey));

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