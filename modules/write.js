import * as fs from 'node:fs/promises';
import * as fsSync from 'node:fs';
import kleur from 'kleur';

const { ART_FOLDER, MUSIC_FILE } = process.env;

const art_folder = ART_FOLDER || 'output/art';

export const writeMap = async (map, name = 'artists') => {
  const obj = Object.fromEntries(map);
  const json = JSON.stringify(obj);
  await fs.writeFile(`output/${name}.json`, json);
};

export const writeBlob = async (key, res, url) => {
  const fileType = url.split('.').pop();
  res.body.pipe(fsSync.createWriteStream(`${art_folder}/${key}.${fileType}`));
};

export const isAlreadyDownloaded = async mbid => {
  const alreadyDownloadedFiles = await fs.readdir(art_folder);
  const match = alreadyDownloadedFiles.find(elemement =>
    elemement.includes(mbid),
  );
  return !!match;
};

export const updateData = async (obj, artists, albums) => {
  obj.forEach(entry => {
    const key = `${entry.artist}|||${entry.album}`;
    if (artists.has(entry.artist)) {
      entry.artistmbid = artists.get(entry.artist);
    }
    if (albums.has(key)) {
      entry.albummbid = JSON.parse(albums.get(key)).mbid;
    }
  });
  const json = JSON.stringify(obj);
  return await fs.writeFile(MUSIC_FILE || `src/node-music.json`, json);
};

export const updateWriteSource = paths => {
  let newFiles = 0;
  console.log(`\tChecking ${kleur.green(paths.size)} source folders`);
  const artFolder = fsSync.readdirSync(art_folder);
  paths.forEach((path, mbid) => {
    if (fsSync.existsSync(path)) {
      const artFile = artFolder.filter(file => file.includes(mbid));
      if (artFile.length === 1) {
        const fileType = artFile[0].split('.').pop();
        if (!fsSync.existsSync(`${path}/cover.${fileType}`)) {
          fsSync.copyFileSync(
            `${art_folder}/${mbid}.${fileType}`,
            `${path}/cover.${fileType}`,
          );
          newFiles++;
        }
      }
    } else {
      console.warn(`⚠️  ${path} ${kleur.red('not found')}`);
    }
  });
  console.log(
    `\tUpdated ${kleur.green(newFiles)} source folder${newFiles === 1 ? '' : 's'}`,
  );
};
