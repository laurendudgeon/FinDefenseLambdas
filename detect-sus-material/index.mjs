import AWS from 'aws-sdk';

const s3 = new AWS.S3();

// Regex patterns for SSN, credit card
const piiPatterns = [
  /\b\d{3}-\d{2}-\d{4}\b/, // SSN
  /\b(?:\d[ -]*?){13,19}\b/ // general credit card number
];

// Check for sensitive info
const containsPII = (content) => {
  return piiPatterns.some(pattern => pattern.test(content));
};

export const handler = async (event) => {
  const { Records } = event;
  
  for (const record of Records) {
    const sourceBucket = record.s3.bucket.name;
    const objectKey = decodeURIComponent(record.s3.object.key.replace(/\+/g, " "));
    
    // Retrieve the file from S3
    const fileData = await s3.getObject({
      Bucket: sourceBucket,
      Key: objectKey,
    }).promise();
    
    const fileContent = fileData.Body.toString('utf-8'); // Convert to text
    
    const piiSuspicious = containsPII(fileContent);

    if (piiSuspicious) {
      // Move the file to the suspicious bucket
      await s3.copyObject({
        CopySource: `${sourceBucket}/${objectKey}`,
        Bucket: 'quokka-sus-reports',  // Suspicious bucket
        Key: objectKey,
      }).promise();
      
      // Delete the original file from the source bucket
      await s3.deleteObject({
        Bucket: sourceBucket,
        Key: objectKey,
      }).promise();
      
      console.log(`Suspicious file moved to quarantine: ${objectKey}`);
    } else {
      console.log(`File is clean: ${objectKey}`);
    }
  }
};

