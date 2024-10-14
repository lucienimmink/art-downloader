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
const daemonMode = !!process.env.npm_config_daemon;

readPackage().then(async () => {
  readPackage().then(async ({ name, version }) => {
    if (!daemonMode)
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
  });
});
