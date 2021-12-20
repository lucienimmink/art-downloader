import * as fs from "fs/promises";

export const readMusicFile = async () => {
  console.log(`Reading node-music.json file`);
  return await fs.readFile(`src/node-music.json`, "utf8");
};

export const readArtistJSON = async () => {
  console.log(`Reading artists.json file`);
  return await fs.readFile(`output/artists.json`, "utf8");
}

export const populateArtistMap = (data) => {
  console.log(`Populating artists`);
  const map = new Map();
  for (const line of JSON.parse(data)) {
    extractArtistFromLine(line, map);
  }
  return map;
};

export const populateAlbumMap = (data) => {
  console.log(`Populating albums`);
  const map = new Map();
  for (const line of JSON.parse(data)) {
    extractAlbumFromLine(line, map);
  }
  return map;
};

const extractArtistFromLine = ({ artist }, map) => {
  map.set(artist, null);
};
const extractAlbumFromLine = ({ artist, album }, map) => {
  map.set(`${artist}|||${album}`, null);
};
