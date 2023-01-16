import * as fs from 'fs/promises';
import dotenv from 'dotenv';
dotenv.config();

const { MUSIC_FILE } = process.env;

export const readMusicFile = async () => {
  return await fs.readFile(MUSIC_FILE || `src/node-music.json`, 'utf8');
};

export const readArtistJSON = async () => {
  return await fs.readFile(`output/artists.json`, 'utf8');
};
export const readAlbumJSON = async () => {
  return await fs.readFile(`output/albums.json`, 'utf8');
};
export const readJSON = async type => {
  switch (type) {
    case 'artists':
      return await readArtistJSON();
    case 'albums':
      return await readAlbumJSON();
    default:
      console.log(`\tCannot handle type ${kleur.red(type)}`);
  }
};

export const populateArtistMap = data => {
  const map = new Map();
  for (const line of JSON.parse(data)) {
    extractArtistFromLine(line, map);
  }
  if (map.has(null)) {
    map.delete(null);
  }
  return map;
};

export const populateAlbumMap = data => {
  const map = new Map();
  for (const line of JSON.parse(data)) {
    extractAlbumFromLine(line, map);
  }
  if (map.has(null)) {
    map.delete(null);
  }
  return map;
};

export const populateMap = (data, type) => {
  switch (type) {
    case 'artists':
      return populateArtistMap(data);
    case 'albums':
      return populateAlbumMap(data);
    default:
      console.log(`\tCannot handle type ${kleur.red(type)}`);
  }
};

export const removeDeletedEntriesFromCacheMap = (map, cache) => {
  Array.from(cache.keys()).forEach(key => {
    if (!map.has(key)) {
      cache.delete(key);
    }
  });
};

const extractArtistFromLine = ({ albumartist, artist }, map) => {
  map.set(albumartist || artist, null);
};
const extractAlbumFromLine = ({ albumartist, artist, album }, map) => {
  map.set(`${albumartist || artist}|||${album}`, null);
};
