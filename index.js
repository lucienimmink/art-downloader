import { styleText } from 'node:util';
import { readPackage } from 'read-pkg';
import { readMusicFile, readOutputfile } from './modules/read.js';
import { printTable } from './modules/print.js';
import timeSpan from './modules/hms.js';
import { handle } from './modules/helpers.js';
import { writeStatus } from './modules/write.js';

/*
  From NPM 12 onwards npm_config variables cannot be read anymore.
  Feel free to give me a hint on how to fix this.
*/

const {
  SKIPARTISTS,
  SKIPALBUMS,
  PRINT_ARTISTS_WITHOUT_ART,
  PRINT_ARTISTS,
  PRINT_ALBUMS_WITHOUT_ART,
  PRINT_ALBUMS,
  UPDATE_LIB,
  WRITE_SOURCE,
  TURBO_MODE,
  DAEMON_MODE,
} = process.env;

readPackage().then(async ({ name, version }) => {
  if (!DAEMON_MODE)
    console.log(`Starting ${styleText('green', `${name} v${version}`)}\n`);
  if (DAEMON_MODE) writeStatus({ status: 'running' });
  let printtype = '';
  let printFilter = '';

  if (PRINT_ARTISTS_WITHOUT_ART) {
    printtype = 'artists-without-art';
  }
  if (PRINT_ARTISTS) {
    printtype = 'artists';
  }
  if (PRINT_ALBUMS) {
    printtype = 'albums';
  }
  if (PRINT_ALBUMS_WITHOUT_ART) {
    printtype = 'albums';
    printFilter = 'unknown';
  }
  if (printtype) {
    const list = JSON.parse(await readOutputfile(printtype, printFilter));
    printTable(list, printtype, printFilter);
    process.exit(0);
  }
  if (UPDATE_LIB) {
    const data = await readMusicFile();
    await handle(data, 'update', TURBO_MODE, DAEMON_MODE);
    process.exit(0);
  }
  if (WRITE_SOURCE) {
    const data = await readMusicFile();
    await handle(data, 'writeSource', TURBO_MODE, DAEMON_MODE);
    process.exit(0);
  }

  const start = new Date().getTime();
  const data = await readMusicFile();
  if (!SKIPARTISTS) {
    await handle(data, 'artists', TURBO_MODE, DAEMON_MODE);
  }
  if (!SKIPALBUMS) {
    await handle(data, 'albums', TURBO_MODE, DAEMON_MODE);
  }
  await handle(data, 'update', TURBO_MODE, DAEMON_MODE);
  await handle(data, 'writeSource', TURBO_MODE, DAEMON_MODE);
  const stop = new Date().getTime();
  if (!DAEMON_MODE)
    console.log(`Finished in ${styleText('yellow', timeSpan(stop - start))}`);
  if (DAEMON_MODE) writeStatus({ status: 'done' }, true);
});
