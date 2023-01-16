import kleur from 'kleur';
import { readPackage } from 'read-pkg';
import { readMusicFile } from './modules/read.js';
import timeSpan from './modules/hms.js';
import { handle } from './modules/helpers.js';

const skipArtists = !!process.env.npm_config_skipArtists;
const skipAlbums = !!process.env.npm_config_skipAlbums;

readPackage().then(async ({ name, version }) => {
  console.log(`Starting ${kleur.green(`${name} v${version}`)}\n`);
  const start = new Date().getTime();
  const data = await readMusicFile();
  if (!skipArtists) {
    await handle(data, 'artists');
  }
  if (!skipAlbums) {
    await handle(data, 'albums');
  }
  const stop = new Date().getTime();
  console.log(`Finished in ${kleur.yellow(timeSpan(stop - start))}`);
});
