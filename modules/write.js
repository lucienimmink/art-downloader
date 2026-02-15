import * as fs from 'node:fs/promises';
import * as fsSync from 'node:fs';
import { styleText } from 'node:util';

const { ART_FOLDER, MUSIC_FILE, OUTPUT_FOLDER } = process.env;

const output_folder = OUTPUT_FOLDER || './output';
const art_folder = ART_FOLDER || `${output_folder}/art`;

export const writeMap = async (map, name = 'artists') => {
  const obj = Object.fromEntries(map);
  const json = JSON.stringify(obj);
  await fs.writeFile(`${output_folder}/${name}.json`, json);
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

let locked = false;
export const writeStatus = async (newStatus, forced = false) => {
  if (locked && !forced) return;
  locked = true;
  const json = JSON.stringify(newStatus);
  await fs.writeFile(`${output_folder}/status.json`, json);
  locked = false;
};

export const updateData = async (obj, artists, albums) => {
  obj.forEach(entry => {
    const key = `${entry.artist}|||${entry.album}`;
    if (artists.has(entry.artist)) {
      entry.artistmbid = artists.get(entry.artist);
    }
    if (albums.has(key)) {
      entry.albummbid = JSON.parse(albums.get(key))?.mbid;
    }
  });
  const json = JSON.stringify(obj);
  return await fs.writeFile(MUSIC_FILE || `src/node-music.json`, json);
};

export const updateWriteSource = (paths, daemonMode = false) => {
  let newFiles = 0;
  if (!daemonMode)
    console.log(
      `\tChecking ${styleText('green', paths.size.toString())} source folders`,
    );
  if (daemonMode) writeStatus({ folders: { total: paths.size } });
  const artFolder = fsSync.readdirSync(art_folder);
  paths.forEach((path, mbid) => {
    if (fsSync.existsSync(path)) {
      const artFile = artFolder.filter(file => file.includes(mbid));
      if (artFile.length === 1) {
        const fileType = artFile[0].split('.').pop();
        if (!fsSync.existsSync(`${path}/cover.${fileType}`)) {
          try {
            // copy via a buffer to avoid issues with cross-device copying (e.g. when the source is on a mounted drive)
            const data = fsSync.readFileSync(`${art_folder}/${mbid}.${fileType}`);
            fsSync.writeFileSync(`${path}/cover.${fileType}`, data);
            newFiles++;
          } catch (err) {
            console.error(`${styleText('red', 'Error')} copying file ${mbid}.${fileType} to ${path}/cover.${fileType}: ${err.toString()}`);
          }
        }
      }
    } else {
      console.warn(`⚠️  ${path} ${styleText('red', 'not found')}`);
    }
  });
  if (!daemonMode)
    console.log(
      `\tUpdated ${styleText('green', newFiles.toString())} source folder${newFiles === 1 ? '' : 's'}`,
    );
  if (daemonMode) writeStatus({ folders: { new: newFiles } });
};
