import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const { ART_FOLDER } = process.env;

const art_folder = ART_FOLDER || 'output/art';

export const writeMap = async (map, name = 'artists') => {
  const obj = Object.fromEntries(map);
  const json = JSON.stringify(obj);
  await fs.writeFile(`output/${name}.json`, json);
};

export const writeBlob = async (key, res) => {
  res.body.pipe(fsSync.createWriteStream(`${art_folder}/${key}.jpg`));
};

export const isAlreadyDownloaded = async mbid => {
  const alreadyDownloadedFiles = await fs.readdir(art_folder);
  const match = alreadyDownloadedFiles.find(elemement =>
    elemement.includes(mbid),
  );
  return !!match;
};
