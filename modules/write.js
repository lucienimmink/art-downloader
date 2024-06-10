import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import { fileTypeFromStream } from 'file-type';
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

export const updateWriteSource = async paths => {
  console.log(`\tUpdating ${kleur.green(paths.size)} source folders`);
  const artFolder = await fs.readdir(art_folder);
  paths.forEach(async (path, mbid) => {
    try {
      const meta = fsSync.statSync(path);
      if (meta.isDirectory()) {
        const artFile = artFolder.filter(file => file.includes(mbid));
        if (artFile.length === 1) {
          const fileType = artFile[0].split('.').pop();
          await fs.copyFile(
            `${art_folder}/${mbid}.${fileType}`,
            `${path}/cover.${fileType}`,
          );
        }
      }
    } catch (e) {
      console.warn(`⚠️  ${path} ${kleur.red('not found')}`);
    }
  });
};
