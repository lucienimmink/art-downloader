import * as fs from 'node:fs/promises';
import kleur from 'kleur';

const { MUSIC_FILE, SOURCE_BASE } = process.env;

export const readMusicFile = async () => {
  return await fs.readFile(MUSIC_FILE || `src/node-music.json`, 'utf8');
};

export const readOutputfile = async (type, filter = '') => {
  const data = await fs.readFile(`output/${type}.json`, 'utf8');
  if (filter === 'unknown') {
    const list = JSON.parse(data);
    const albums = Object.keys(list);
    const unknown = albums.filter(key => {
      return (
        JSON.parse(list[key])?.url === '' && JSON.parse(list[key])?.mbid !== ''
      );
    });
    const unkownAlbums = new Map();
    unknown.forEach(id => {
      unkownAlbums.set(id, list[id]);
    });
    return JSON.stringify(Object.fromEntries(unkownAlbums));
  }
  return data;
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

export const populateAlbumPathMap = data => {
  const map = new Map();
  for (const line of JSON.parse(data)) {
    extractAlbumPathFromLine(line, map);
  }
  if (map.has(null)) {
    map.delete(null);
  }
  if (map.has('')) {
    map.delete('');
  }
  if (map.has(undefined)) {
    map.delete(undefined);
  }
  return map;
};

export const populateMap = (data, type) => {
  switch (type) {
    case 'artists':
      return populateArtistMap(data);
    case 'albums':
      return populateAlbumMap(data);
    case 'path':
      return populateAlbumPathMap(data);
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
const extractAlbumPathFromLine = ({ path, albummbid }, map) => {
  if (!SOURCE_BASE) {
    console.log(
      `\t${kleur.red('SOURCE_BASE')} not set, see ${kleur.yellow('README.md')}`,
    );
    process.exit(1);
  }
  map.set(
    albummbid,
    `${SOURCE_BASE}${path.substring(0, path.lastIndexOf('/'))}`,
  );
};
