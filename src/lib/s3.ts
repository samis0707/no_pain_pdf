import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const S3_BUCKET = process.env.S3_BUCKET ?? 'uploads'

export const s3Client = new S3Client({
  region: process.env.S3_REGION ?? 'us-east-1',
  endpoint: process.env.S3_ENDPOINT
    ? `${process.env.S3_ENDPOINT}:${process.env.S3_PORT ?? '9000'}`
    : undefined,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY ?? 'minioadmin',
    secretAccessKey: process.env.S3_SECRET_KEY ?? 'minioadmin',
  },
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== 'false',
})

export async function uploadFile(key: string, body: Buffer | string, contentType?: string) {
  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType,
  })
  return s3Client.send(command)
}

export async function getFile(key: string) {
  const command = new GetObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
  })
  const response = await s3Client.send(command)
  return response.Body
}

export async function deleteFile(key: string) {
  const command = new DeleteObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
  })
  return s3Client.send(command)
}

export async function listFiles(prefix?: string) {
  const command = new ListObjectsV2Command({
    Bucket: S3_BUCKET,
    Prefix: prefix,
  })
  return s3Client.send(command)
}

export async function generateUploadUrl(key: string, expiresIn = 3600) {
  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
  })
  return getSignedUrl(s3Client, command, { expiresIn })
}

export async function generateDownloadUrl(key: string) {
  const command = new GetObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
  })
  return getSignedUrl(s3Client, command, { expiresIn: 3600 })
}
