import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const { ART_FOLDER, MUSIC_FILE } = process.env;

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

function sleep(ms) {
  console.log(`going to sleep for ${ms}ms...`);
  return new Promise(resolve => setTimeout(resolve, ms));
}

export const updateData = async (obj, artists, albums) => {
  obj.forEach(entry => {
    const key = `${entry.artist}|||${entry.album}`;
    if (artists.has(entry.artist)) {
      entry.artistmbid = artists.get(entry.artist);
    }
    if (albums.has(key)) {
      entry.albummbid = JSON.parse(albums.get(key)).mbid;
    }
  });
  const json = JSON.stringify(obj);
  return await fs.writeFile(MUSIC_FILE || `src/node-music.json`, json);
};
