import * as fs from 'fs/promises';
import dotenv from 'dotenv';
dotenv.config();

const { MUSIC_FILE } = process.env;

export const readMusicFile = async () => {
  return await fs.readFile(MUSIC_FILE || `src/node-music.json`, 'utf8');
};

export const readArtistsWithoutArtFile = async () => {
  return await fs.readFile(`output/artists-without-art.json`, 'utf8');
};

export const readJSON = async type => {
  try {
    return await fs.readFile(`output/${type}.json`, 'utf8');
  } catch (error) {
    return '{}';
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
