import * as fs from 'fs/promises';

export const readMusicFile = async () => {
  return await fs.readFile(`src/node-music.json`, 'utf8');
};

export const readArtistJSON = async () => {
  return await fs.readFile(`output/artists.json`, 'utf8');
};

export const populateArtistMap = data => {
  const map = new Map();
  for (const line of JSON.parse(data)) {
    extractArtistFromLine(line, map);
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

const extractArtistFromLine = ({ albumartist, artist }, map) => {
  map.set(albumartist || artist, null);
};
const extractAlbumFromLine = ({ albumartist, artist, album }, map) => {
  map.set(`${albumartist || artist}|||${album}`, null);
};
