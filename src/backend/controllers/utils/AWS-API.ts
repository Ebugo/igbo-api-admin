import * as functions from 'firebase-functions';
import AWS from 'aws-sdk';
import {
  AWS_ACCESS_KEY,
  AWS_SECRET_ACCESS_KEY,
  AWS_BUCKET,
  AWS_REGION,
} from '../../config';

const bucket = AWS_BUCKET;
const region = AWS_REGION;
const pronunciationPath = 'audio-pronunciations';
const uriPath = `https://${bucket}.s3.${region}.amazonaws.com/${pronunciationPath}`;
const dummyUriPath = 'https://igbo-api-test-local/audio-pronunciations/';
const baseParams = {
  Bucket: bucket,
};

const s3 = (() => {
  AWS.config.update({
    accessKeyId: AWS_ACCESS_KEY,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
    region,
  });

  return new AWS.S3();
})();

const config = functions.config();
const isProduction = config?.runtime?.env === 'production';
const isCypress = config?.runtime?.env === 'cypress';
/* Puts a new .webm object in the AWS S3 Bucket */
export const createAudioPronunciation = async (id: string, pronunciationData: string): Promise<string> => {
  if (!id || !pronunciationData) {
    throw new Error('id and pronunciation must be provided');
  }
  if (isCypress || !isProduction) {
    return `${dummyUriPath}${id}`;
  }
  const base64Data = Buffer.from(pronunciationData.replace(/^data:.+;base64,/, ''), 'base64');
  const params = {
    ...baseParams,
    Key: `${pronunciationPath}/${id}.webm`,
    Body: base64Data,
    ACL: 'public-read',
    ContentEncoding: 'base64',
    ContentType: 'audio/webm',
  };

  const { Location } = await s3.upload(params).promise();
  return Location;
};

/* Deletes a .webm object in the AWS S3 Bucket */
export const deleteAudioPronunciation = async (id): Promise<any> => {
  if (!id) {
    throw new Error('No pronunciation id provided');
  }
  if (isCypress || !isProduction) {
    return `${dummyUriPath}${id}`;
  }
  const params = {
    ...baseParams,
    Key: `${pronunciationPath}/${id}.webm`,
  };

  return s3.deleteObject(params).promise();
};
/* Takes an old and new pronunciation id and copies it (copies) */
export const copyAudioPronunciation = async (oldDocId: string, newDocId: string): Promise<any> => {
  if (isCypress || !isProduction) {
    return `${dummyUriPath}${newDocId}`;
  }

  const copyParams = {
    ...baseParams,
    Key: `${pronunciationPath}/${newDocId}.webm`,
    ACL: 'public-read',
    CopySource: `${bucket}/${pronunciationPath}/${oldDocId}.webm`,
  };

  await s3.copyObject(copyParams).promise();
  const copiedAudioPronunciationUri = `${uriPath}/${newDocId}.webm`;
  return copiedAudioPronunciationUri;
};

/* Takes an old and new pronunciation id and renames it (copies and deletes) */
export const renameAudioPronunciation = async (oldDocId: string, newDocId: string): Promise<any> => {
  if (isCypress || !isProduction) {
    if (!oldDocId) {
      return '';
    }
    return `${dummyUriPath}${newDocId}`;
  }
  /**
   * If the Word Suggestion doesn't have an audio pronunciation
   * for the field, then the audio pronunciation in the Word
   * will be deleted
   * */
  if (!oldDocId) {
    await deleteAudioPronunciation(newDocId);
    return '';
  }

  const renamedAudioPronunciationUri = await copyAudioPronunciation(oldDocId, newDocId);
  await deleteAudioPronunciation(oldDocId);

  return renamedAudioPronunciationUri;
};
