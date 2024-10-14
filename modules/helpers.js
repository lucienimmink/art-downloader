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
import {
  writeMap,
  updateData,
  updateWriteSource,
  writeStatus,
} from './write.js';

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
const handleArtists = async (data, isTurbo = false, daemonMode = false) => {
  const map = await readData(data, 'artists', !daemonMode);
  const newMBIDs = await getMBID(map, 'artists', isTurbo, daemonMode);
  writeMap(map, 'artists');
  const { mBIDToUrlMap, artistsWithoutArt } = await getArtForArtists(
    isTurbo ? newMBIDs : map,
    isTurbo,
    daemonMode,
  );
  if (mBIDToUrlMap.size !== 0) {
    if (!daemonMode)
      console.log(
        `\tDownload: ${styleText('green', mBIDToUrlMap.size.toString())}`,
      );
    await downloadImageForMBIDs(mBIDToUrlMap, daemonMode);
  }
  if (artistsWithoutArt.size !== 0 && !daemonMode) {
    if (!daemonMode)
      console.log(
        `\tWithout art: ${styleText('red', artistsWithoutArt.size.toString())}`,
      );
  }
  await writeMap(artistsWithoutArt, 'artists-without-art');
};

const handleAlbums = async (data, isTurbo = false, daemonMode = false) => {
  const map = await readData(data, 'albums', !daemonMode);
  const newMBIDs = await getMBID(map, 'albums', isTurbo, daemonMode);
  writeMap(map, 'albums');
  const { mBIDToUrlMapForAlbums, albumsWithoutArt } = await getArtForAlbums(
    isTurbo ? newMBIDs : map,
    isTurbo,
    daemonMode,
  );
  if (mBIDToUrlMapForAlbums.size !== 0) {
    if (!daemonMode)
      console.log(
        `\tDownload: ${styleText('green', mBIDToUrlMapForAlbums.size.toString())}`,
      );
    await downloadImageForMBIDs(mBIDToUrlMapForAlbums, daemonMode);
  }
  if (albumsWithoutArt.size !== 0) {
    if (!daemonMode)
      console.log(
        `\tWithout art: ${styleText('red', albumsWithoutArt.size.toString())}`,
      );
  }
  await writeMap(albumsWithoutArt, 'albums-without-art');
};

const handleUpdate = async (data, artists, albums, daemonMode = false) => {
  try {
    return updateData(data, artists, albums, daemonMode);
  } catch (e) {
    console.error(e);
  }
};

const handleWriteSource = (paths, daemonMode = false) => {
  try {
    return updateWriteSource(paths, daemonMode);
  } catch (e) {
    console.error(e);
  }
};

export const handle = async (
  data,
  type,
  isTurbo = false,
  daemonMode = false,
) => {
  if (!daemonMode)
    console.log(
      `Handling ${styleText(
        'cyan',
        type.replace(/^\w/, c => c.toUpperCase()),
      )} ${isTurbo ? `in ${styleText('green', 'turbo')} mode` : ``}`,
    );
  if (daemonMode) writeStatus({ action: type });
  switch (type) {
    case 'artists':
      await handleArtists(data, isTurbo, daemonMode);
      break;
    case 'albums':
      await handleAlbums(data, isTurbo, daemonMode);
      break;
    case 'update':
      const artists = await readData(data, 'artists', false);
      const albums = await readData(data, 'albums', false);
      await handleUpdate(JSON.parse(data), artists, albums, daemonMode);
      break;
    case 'writeSource':
      const paths = await readData(data, 'path', false);
      handleWriteSource(paths, daemonMode);
      break;
    default:
      console.warn(`\tCannot handle type ${styleText('red', type)}`);
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
