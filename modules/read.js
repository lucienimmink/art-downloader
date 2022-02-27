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
  return map;
};

export const removeDeletedArtistsFromCacheMap = (map, cache) => {
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
