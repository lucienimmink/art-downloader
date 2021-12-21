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
  let cachedArtistsJSON = "{}";
  try {
    cachedArtistsJSON = await readArtistJSON();
  } catch (e) {}
  const cachedArtists = new Map(Object.entries(JSON.parse(cachedArtistsJSON)));
  console.log(`Found ${kleur.green(cachedArtists.size)} cached artists`);
  const mergedArtists = new Map([...artistMap, ...cachedArtists]);
  await getMBIDForArtists(mergedArtists);
  writeMap(mergedArtists, 'artist');
  const urlsForMBIDs = await getArtForArtists(mergedArtists);
  console.log(`Going to download ${kleur.green(urlsForMBIDs.size)} URLs`);
  await downloadImageForMBIDs(urlsForMBIDs);
  console.log(`${kleur.green(`All is done!`)}`);
});
