import { styleText } from 'node:util';
import { readPackage } from 'read-pkg';
import { readMusicFile, readOutputfile } from './modules/read.js';
import { printTable } from './modules/print.js';
import timeSpan from './modules/hms.js';
import { handle } from './modules/helpers.js';

const skipArtists = !!process.env.npm_config_skipArtists;
const skipAlbums = !!process.env.npm_config_skipAlbums;
const printArtistsWithoutArt = !!process.env.npm_config_printArtistsWithoutArt;
const printArtists = !!process.env.npm_config_printArtists;
const printAlbumsWithoutArt = !!process.env.npm_config_printAlbumsWithoutArt;
const printAlbums = !!process.env.npm_config_printAlbums;
const updateLib = !!process.env.npm_config_updateLib;
const writeSource = !!process.env.npm_config_writeSource;
const isTurbo = !!process.env.npm_config_turbo;

readPackage().then(async ({ name, version }) => {
  console.log(`Starting ${styleText('green', `${name} v${version}`)}\n`);
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
    await handle(data, 'update');
    process.exit(0);
  }
  if (writeSource) {
    const data = await readMusicFile();
    await handle(data, 'writeSource');
    process.exit(0);
  }

  const start = new Date().getTime();
  const data = await readMusicFile();
  if (!skipArtists) {
    await handle(data, 'artists', isTurbo);
  }
  if (!skipAlbums) {
    await handle(data, 'albums', isTurbo);
  }
  await handle(data, 'update');
  await handle(data, 'writeSource');
  const stop = new Date().getTime();
  console.log(`Finished in ${styleText('yellow', timeSpan(stop - start))}`);
});
