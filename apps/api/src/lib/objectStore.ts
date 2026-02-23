import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import type { Question } from "@tv-trivia/shared";

function getObjectStoreConfig() {
  const endpoint = process.env.OBJECT_STORE_ENDPOINT?.trim();
  const region = process.env.OBJECT_STORE_REGION?.trim() || "us-east-1";
  const bucket = process.env.OBJECT_STORE_BUCKET?.trim();
  const accessKeyId = process.env.OBJECT_STORE_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.OBJECT_STORE_SECRET_ACCESS_KEY?.trim();

  return {
    endpoint,
    region,
    bucket,
    accessKeyId,
    secretAccessKey,
  };
}

export function isObjectStoreConfigured(): boolean {
  const { bucket, accessKeyId, secretAccessKey } = getObjectStoreConfig();
  return Boolean(bucket && accessKeyId && secretAccessKey);
}

let cachedClient: S3Client | null = null;

function getS3Client(): S3Client {
  if (cachedClient) {
    return cachedClient;
  }

  const config = getObjectStoreConfig();
  cachedClient = new S3Client({
    region: config.region,
    endpoint: config.endpoint || undefined,
    forcePathStyle: Boolean(config.endpoint),
    credentials:
      config.accessKeyId && config.secretAccessKey
        ? {
            accessKeyId: config.accessKeyId,
            secretAccessKey: config.secretAccessKey,
          }
        : undefined,
  });

  return cachedClient;
}

export async function uploadQuestionBankSnapshot(input: {
  decade: string;
  showSetHash: string;
  questions: Question[];
  shows: string[];
}): Promise<string | null> {
  if (!isObjectStoreConfigured()) {
    return null;
  }

  const { bucket } = getObjectStoreConfig();
  if (!bucket) {
    return null;
  }

  const objectKey = `question-banks/${input.decade}/${input.showSetHash}/${Date.now()}.json`;
  const payload = {
    decade: input.decade,
    shows: input.shows,
    questions: input.questions,
    generatedAt: new Date().toISOString(),
  };

  await getS3Client().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: objectKey,
      Body: JSON.stringify(payload),
      ContentType: "application/json",
    })
  );

  return objectKey;
}
