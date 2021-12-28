import kleur from 'kleur';
import { readPackage } from 'read-pkg';
import {
  readMusicFile,
  readArtistJSON,
  populateArtistMap,
} from './modules/read.js';
import {
  getMBIDForArtists,
  getArtForArtists,
  downloadImageForMBIDs,
} from './modules/fetch.js';
import { writeMap } from './modules/write.js';

readPackage().then(async ({ name, version }) => {
  console.log(`starting ${kleur.blue(`${name} v${version}`)}`);
  const data = await readMusicFile();
  const artistMap = populateArtistMap(data);
  console.log(`Found ${kleur.green(artistMap.size)} artists`);
  let cachedArtistsJSON = '{}';
  try {
    cachedArtistsJSON = await readArtistJSON();
  } catch (e) {}
  const cachedArtists = new Map(Object.entries(JSON.parse(cachedArtistsJSON)));
  console.log(`Found ${kleur.green(cachedArtists.size)} cached artists`);
  const mergedArtists = new Map([...artistMap, ...cachedArtists]);
  await getMBIDForArtists(mergedArtists);
  writeMap(mergedArtists, 'artists');
  const { mBIDToUrlMap, artistsWithoutArt } = await getArtForArtists(
    mergedArtists
  );
  console.log(`Going to download ${kleur.green(mBIDToUrlMap.size)} URLs`);
  await downloadImageForMBIDs(mBIDToUrlMap);
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
