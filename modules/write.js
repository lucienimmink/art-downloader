import * as fs from 'fs/promises';
import * as fsSync from 'fs';

export const writeMap = async (map, name = 'artists') => {
  const obj = Object.fromEntries(map);
  const json = JSON.stringify(obj);
  await fs.writeFile(`output/${name}.json`, json);
};

export const writeBlob = async (key, res) => {
  res.body.pipe(fsSync.createWriteStream(`output/art/${key}.jpg`));
};

export const isAlreadyDownloaded = async mbid => {
  const alreadyDownloadedFiles = await fs.readdir('output/art');
  const match = alreadyDownloadedFiles.find(elemement =>
    elemement.includes(mbid)
  );
  return !!match;
};
