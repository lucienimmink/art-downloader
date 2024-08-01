import { styleText } from 'node:util';
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
import { writeMap, updateData, updateWriteSource } from './write.js';

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
const readData = async (data, type, print = true) => {
  const map = populateMap(data, type);
  if (print) console.log(`\tFound: ${styleText('green', map.size.toString())}`);

  const cache = await readJSON(type);
  const cachedMap = cleanCacheMap(map, cache);
  if (print)
    console.log(`\tCached: ${styleText('green', cachedMap.size.toString())}`);

  return new Map([...map, ...cachedMap]);
};
const handleArtists = async (data, isTurbo = false) => {
  const map = await readData(data, 'artists');
  const newMBIDs = await getMBID(map, 'artists', isTurbo);
  writeMap(map, 'artists');
  const { mBIDToUrlMap, artistsWithoutArt } = await getArtForArtists(
    isTurbo ? newMBIDs : map,
    isTurbo,
  );
  if (mBIDToUrlMap.size !== 0) {
    console.log(
      `\tDownload: ${styleText('green', mBIDToUrlMap.size.toString())}`,
    );
    await downloadImageForMBIDs(mBIDToUrlMap);
  }
  if (artistsWithoutArt.size !== 0) {
    console.log(
      `\tWithout art: ${styleText('red', artistsWithoutArt.size.toString())}`,
    );
  }
  await writeMap(artistsWithoutArt, 'artists-without-art');
};

const handleAlbums = async (data, isTurbo = false) => {
  const map = await readData(data, 'albums', isTurbo);
  const newMBIDs = await getMBID(map, 'albums');
  writeMap(map, 'albums');
  const { mBIDToUrlMapForAlbums, albumsWithoutArt } = await getArtForAlbums(
    isTurbo ? newMBIDs : map,
    isTurbo,
  );
  if (mBIDToUrlMapForAlbums.size !== 0) {
    console.log(
      `\tDownload: ${styleText('green', mBIDToUrlMapForAlbums.size.toString())}`,
    );
    await downloadImageForMBIDs(mBIDToUrlMapForAlbums);
  }
  if (albumsWithoutArt.size !== 0) {
    console.log(
      `\tWithout art: ${styleText('red', albumsWithoutArt.size.toString())}`,
    );
  }
  await writeMap(albumsWithoutArt, 'albums-without-art');
};

const handleUpdate = async (data, artists, albums) => {
  try {
    return updateData(data, artists, albums);
  } catch (e) {
    console.error(e);
  }
};

const handleWriteSource = paths => {
  try {
    return updateWriteSource(paths);
  } catch (e) {
    console.error(e);
  }
};

export const handle = async (data, type, isTurbo = false) => {
  console.log(
    `Handling ${styleText(
      'cyan',
      type.replace(/^\w/, c => c.toUpperCase()),
    )} ${isTurbo ? `in ${styleText('green', 'turbo')} mode` : ``}`,
  );
  switch (type) {
    case 'artists':
      await handleArtists(data, isTurbo);
      break;
    case 'albums':
      await handleAlbums(data, isTurbo);
      break;
    case 'update':
      const artists = await readData(data, 'artists', false);
      const albums = await readData(data, 'albums', false);
      await handleUpdate(JSON.parse(data), artists, albums);
      break;
    case 'writeSource':
      const paths = await readData(data, 'path', false);
      handleWriteSource(paths);
      break;
    default:
      console.log(`\tCannot handle type ${styleText('red', type)}`);
  }
};

const sorter = (aArtist, bArtist) => {
  if (aArtist < bArtist) return -1;
  if (aArtist > bArtist) return 1;
  return 0;
};

export const sortArtists = (a, b) => {
  const aArtist = a?.toLowerCase();
  const bArtist = b?.toLowerCase();
  return sorter(aArtist, bArtist);
};
export const sortAlbums = (a, b) => {
  const aArtist = a.split('|||')[0]?.toLowerCase();
  const bArtist = b.split('|||')[0]?.toLowerCase();
  return sorter(aArtist, bArtist);
};
