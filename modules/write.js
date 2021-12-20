import * as fs from "fs/promises";
import * as fsSync from "fs";
import sharp from "sharp";

export const writeMap = async (map, type) => {
    const obj = Object.fromEntries(map);
    const json = JSON.stringify(obj);
    await fs.writeFile('output/artists.json', json);
};

export const writeBlob = async (key, res) => {
  const webp = sharp().webp();
  res.body.pipe(webp).pipe(fsSync.createWriteStream(`output/art/${key}.webp`));
}

export const isAlreadyDownloaded = async (mbid) => {
  const alreadyDownloadedFiles = await fs.readdir("output/art");
  return alreadyDownloadedFiles.includes(`${mbid}.jpg`);
}
