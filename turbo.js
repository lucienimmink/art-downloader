import { styleText } from 'node:util';
import { readPackage } from 'read-pkg';
import { readMusicFile, readOutputfile } from './modules/read.js';
import { printTable } from './modules/print.js';
import timeSpan from './modules/hms.js';
import { handle } from './modules/helpers.js';
import { writeStatus } from './modules/write.js';

/*
  cannot read npm_config variables anymore in npm 12. For the turbo mode we predefine some variables
*/
const skipArtists = false;
const skipAlbums = false;
const printArtistsWithoutArt = false;
const printArtists = false;
const printAlbumsWithoutArt = false;
const printAlbums = false;
const updateLib = false;
const writeSource = false;
const isTurbo = true;
const daemonMode = false;

readPackage().then(async ({ name, version }) => {
  if (!daemonMode)
    console.log(`Starting ${styleText('green', `${name} v${version}`)}\n`);
  if (daemonMode) writeStatus({ status: 'running' });
  let printtype = '';
  let printFilter = '';

  if (printArtistsWithoutArt) {
    printtype = 'artists-without-art';
  }
  if (printArtists) {
    printtype = 'artists';
  }
  if (printAlbums) {
    printtype = 'albums';
  }
  if (printAlbumsWithoutArt) {
    printtype = 'albums';
    printFilter = 'unknown';
  }
  if (printtype) {
    const list = JSON.parse(await readOutputfile(printtype, printFilter));
    printTable(list, printtype, printFilter);
    process.exit(0);
  }
  if (updateLib) {
    const data = await readMusicFile();
    await handle(data, 'update', isTurbo, daemonMode);
    process.exit(0);
  }
  if (writeSource) {
    const data = await readMusicFile();
    await handle(data, 'writeSource', isTurbo, daemonMode);
    process.exit(0);
  }

  const start = new Date().getTime();
  const data = await readMusicFile();
  if (!skipArtists) {
    await handle(data, 'artists', isTurbo, daemonMode);
  }
  if (!skipAlbums) {
    await handle(data, 'albums', isTurbo, daemonMode);
  }
  await handle(data, 'update', isTurbo, daemonMode);
  await handle(data, 'writeSource', isTurbo, daemonMode);
  const stop = new Date().getTime();
  if (!daemonMode)
    console.log(`Finished in ${styleText('yellow', timeSpan(stop - start))}`);
  if (daemonMode) writeStatus({ status: 'done' }, true);
});
