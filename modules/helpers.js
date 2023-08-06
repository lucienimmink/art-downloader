import kleur from 'kleur';
import {
  readJSON,
  populateMap,
  removeDeletedEntriesFromCacheMap,
} from './read.js';
import {
  getMBID,
  getArtForArtists,
  downloadImageForMBIDs,
  getArtForAlbums,
} from './fetch.js';
import { writeMap } from './write.js';

export const asyncForEach = async (array, callback) => {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
};

export const sleep = milliseconds => {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
};

const cleanCacheMap = (map, cache) => {
  const cachedMap = new Map(Object.entries(JSON.parse(cache)));
  removeDeletedEntriesFromCacheMap(map, cachedMap);
  return cachedMap;
};
const readData = async (data, type) => {
  const map = populateMap(data, type);
  console.log(`\tFound: ${kleur.green(map.size)}`);

  const cache = await readJSON(type);
  const cachedMap = cleanCacheMap(map, cache);
  console.log(`\tCached: ${kleur.green(cachedMap.size)}`);

  return new Map([...map, ...cachedMap]);
};
const handleArtists = async data => {
  const map = await readData(data, 'artists');
  await getMBID(map, 'artists');
  writeMap(map, 'artists');
  const { mBIDToUrlMap, artistsWithoutArt } = await getArtForArtists(map);
  if (mBIDToUrlMap.size !== 0) {
    console.log(`\tDownload: ${kleur.green(mBIDToUrlMap.size)}`);
    await downloadImageForMBIDs(mBIDToUrlMap);
  }
  if (artistsWithoutArt.size !== 0) {
    console.log(`\tWithout art: ${kleur.red(artistsWithoutArt.size)}`);
  }
  await writeMap(artistsWithoutArt, 'artists-without-art');
};

const handleAlbums = async data => {
  const map = await readData(data, 'albums');
  await getMBID(map, 'albums');
  writeMap(map, 'albums');
  const mBIDToUrlMap = await getArtForAlbums(map);
  if (mBIDToUrlMap.size !== 0) {
    console.log(`\tDownload: ${kleur.green(mBIDToUrlMap.size)}`);
    await downloadImageForMBIDs(mBIDToUrlMap);
  }
};

export const handle = async (data, type) => {
  console.log(
    `Handling ${kleur.cyan(type.replace(/^\w/, c => c.toUpperCase()))}`,
  );
  switch (type) {
    case 'artists':
      await handleArtists(data);
      break;
    case 'albums':
      await handleAlbums(data);
      break;
    default:
      console.log(`\tCannot handle type ${kleur.red(type)}`);
  }
};
