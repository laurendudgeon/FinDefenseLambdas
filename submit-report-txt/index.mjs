import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client();
const BUCKET_NAME = "quokka-submitted-reports";

export const handler = async (event) => {
    try {
        const { record } = event;  // Destructure the record from the event
        if (!record || !record.report_id) {
            throw new Error("Missing report_id in event detail");
        }

        const reportId = record.report_id;
        console.log(`Generating TXT file for report_id: ${reportId}`);

        // Generate TXT file content using event data
        let fileContent = `Report ID: ${reportId}\nGenerated On: ${new Date().toLocaleDateString()}\n\n`;
        fileContent += "Report Data:\n";
        fileContent += "-----------------------------\n";
        fileContent += "Ticket Number | Report Type | Description | Status | Priority | Damages\n";
        fileContent += "-----------------------------\n";

        fileContent += `${record.ticket_number} | ${record.report_type} | ${record.description} | ${record.status} | ${record.priority} | ${record.monetary_damage}\n`;

        console.log("TXT file content generated");

        const s3Key = `reports${reportId}.txt`;

        // Upload the TXT file to S3
        await s3.send(
            new PutObjectCommand({
                Bucket: BUCKET_NAME,
                Key: s3Key,
                Body: fileContent,
                ContentType: "text/plain",
            })
        );

        console.log(`TXT file stored in S3 at ${s3Key}`);

        const url = await getSignedUrl(s3, new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: s3Key,
        }), { expiresIn: 3600 });  // URL valid for 1 hour

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: "TXT file generated and uploaded",
                downloadedURL: url,
                s3Key
            }),
        };
    } catch (error) {
        console.error("Error generating or uploading TXT:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Failed to generate and upload TXT file" }),
        };
    }
};
