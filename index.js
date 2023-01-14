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

readPackage().then(async ({ name, version }) => {
  console.log(`Starting ${kleur.green(`${name} v${version}`)}`);
  const data = await readMusicFile();
  const artistMap = populateArtistMap(data);
  const albumMap = populateAlbumMap(data);
  console.log(
    `Found ${kleur.green(artistMap.size)} artists and ${kleur.green(
      albumMap.size
    )} albums`
  );
  let cachedArtistsJSON = '{}';
  let cachedAlbumsJSON = '{}';
  try {
    cachedArtistsJSON = await readArtistJSON();
    cachedAlbumsJSON = await readAlbumJSON();
  } catch (e) {}
  const cachedArtists = new Map(Object.entries(JSON.parse(cachedArtistsJSON)));
  const cachedAlbums = new Map(Object.entries(JSON.parse(cachedAlbumsJSON)));
  removeDeletedEntriesFromCacheMap(artistMap, cachedArtists);
  removeDeletedEntriesFromCacheMap(albumMap, cachedAlbums);
  console.log(
    `Found ${kleur.green(cachedArtists.size)} cached artists and ${kleur.green(
      cachedAlbums.size
    )} cached albums`
  );
  const mergedArtists = new Map([...artistMap, ...cachedArtists]);
  const mergedAlbums = new Map([...albumMap, ...cachedAlbums]);
  await getMBIDForArtists(mergedArtists);
  await getMBIDForAlbums(mergedAlbums);
  writeMap(mergedArtists, 'artists');
  writeMap(mergedAlbums, 'albums');
  const { mBIDToUrlMap, artistsWithoutArt } = await getArtForArtists(
    mergedArtists
  );
  const mBIDToUrlMapForAlbums = await getArtForAlbums(mergedAlbums);
  if (mBIDToUrlMap.size !== 0) {
    console.log(
      `Going to download ${kleur.green(mBIDToUrlMap.size)} URLs for artists`
    );
    await downloadImageForMBIDs(mBIDToUrlMap);
  }
  if (mBIDToUrlMapForAlbums.size !== 0) {
    console.log(
      `Going to download ${kleur.green(
        mBIDToUrlMapForAlbums.size
      )} URLs for albums`
    );
    await downloadImageForMBIDs(mBIDToUrlMapForAlbums);
  }
  if (artistsWithoutArt.size !== 0) {
    console.log(
      `Found ${kleur.red(artistsWithoutArt.size)} artist${
        artistsWithoutArt.size !== 1 ? 's' : ''
      } without art`
    );
  }
  await writeMap(artistsWithoutArt, 'artists-without-art');
  console.log(`${kleur.green(`All is done!`)}`);
});
