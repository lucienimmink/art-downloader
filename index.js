import kleur from 'kleur';
import { readPackage } from 'read-pkg';
import {
  readMusicFile,
  readArtistJSON,
  readAlbumJSON,
  populateArtistMap,
  populateAlbumMap,
  removeDeletedEntriesFromCacheMap,
} from './modules/read.js';
import {
  getMBIDForArtists,
  getMBIDForAlbums,
  getArtForArtists,
  downloadImageForMBIDs,
  getArtForAlbums,
} from './modules/fetch.js';
import { writeMap } from './modules/write.js';
import timeSpan from './modules/hms.js';

const skipArtists = !!process.env.npm_config_skipArtists;
const skipAlbums = !!process.env.npm_config_skipAlbums;

const handleArtists = async data => {
  console.log(`Handling ${kleur.cyan('Artists')}`);
  const map = populateArtistMap(data);
  console.log(`\tFound: ${kleur.green(map.size)}`);

  const cache = await readArtistJSON();
  const cachedMap = new Map(Object.entries(JSON.parse(cache)));
  removeDeletedEntriesFromCacheMap(map, cachedMap);
  console.log(`\tCached: ${kleur.green(cachedMap.size)}`);

  const mergedMap = new Map([...map, ...cachedMap]);
  await getMBIDForArtists(mergedMap);
  writeMap(mergedMap, 'artists');
  const { mBIDToUrlMap, artistsWithoutArt } = await getArtForArtists(mergedMap);
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
  console.log(`Handling ${kleur.cyan('Albums')}`);
  const map = populateAlbumMap(data);
  console.log(`\tFound: ${kleur.green(map.size)}`);

  const cache = await readAlbumJSON();
  const cachedMap = new Map(Object.entries(JSON.parse(cache)));
  removeDeletedEntriesFromCacheMap(map, cachedMap);
  console.log(`\tCached: ${kleur.green(cachedMap.size)}`);

  const mergedMap = new Map([...map, ...cachedMap]);
  await getMBIDForAlbums(mergedMap);
  writeMap(mergedMap, 'albums');
  const mBIDToUrlMap = await getArtForAlbums(mergedMap);
  if (mBIDToUrlMap.size !== 0) {
    console.log(`\tDownload: ${kleur.green(mBIDToUrlMap.size)}`);
    await downloadImageForMBIDs(mBIDToUrlMap);
  }
};

readPackage().then(async ({ name, version }) => {
  console.log(`Starting ${kleur.green(`${name} v${version}`)}\n`);
  const start = new Date().getTime();
  const data = await readMusicFile();
  if (!skipArtists) {
    await handleArtists(data);
  }
  if (!skipAlbums) {
    await handleAlbums(data);
  }
  const stop = new Date().getTime();
  console.log(`Finished in ${kleur.yellow(timeSpan(stop - start))}`);
});
