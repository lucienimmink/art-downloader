import fetch from "node-fetch";
import ora from "ora";
import kleur from "kleur";
import dotenv from "dotenv";
dotenv.config();

import { asyncForEach } from "./helpers.js";
import { writeBlob, isAlreadyDownloaded } from "./write.js";

const { LASTFMAPIKEY, FANARTAPIKEY } = process.env;

export const getMBIDForArtists = async (map) => {
  const start = new Date().getTime();
  const percent = Math.floor(map.size / 100);
  let count = 0;
  let fetched = 0;
  const spinner = ora("Fetching meta data for artists").start();
  await asyncForEach(Array.from(map.keys()), async (key) => {
    const hasMBID = !!map.get(key);
    if (!hasMBID) {
      try {
          const { artist } = await getMetaInfo({ artist: key });
          const mbid = artist?.mbid;
          map.set(key, mbid);
          fetched++;
      } catch (e) {
        console.log(`encountered an error while getting meta-info for ${kleur.yellow(key)} with MBID ${kleur.yellow(mbid)}`)
      }
    }
    count++;
    if (count % percent === 0) {
      spinner.color = "yellow";
      spinner.text = `Fetching meta data for artists - ${
        count / percent
      }% done`;
    }
  });
  const stop = new Date().getTime();
  spinner.stop();
  console.log(
    `Fetched ${kleur.green(fetched)} MBIDs in ${kleur.yellow(
      (stop - start) / 1000
    )}s`
  );
};

export const getArtForArtists = async (map) => {
  const MBIDToUrlMap = new Map();
  await asyncForEach(Array.from(map.keys()), async (key) => {
    const mbid = map.get(key);
    const hasMBID = !!mbid;
    if (hasMBID && ! await isAlreadyDownloaded(mbid)) {
      try {
        const url = await getFanArt(mbid);
        MBIDToUrlMap.set(mbid, url);
      } catch (e) {
        // not found in FanArt
        try {
          const url = await getAudioDB(key);
          MBIDToUrlMap.set(mbid, url);
        } catch (e) {
          // not found in AudioDB
          console.log(`cannot find art for ${kleur.red(key)}, the MBID is ${kleur.yellow(mbid)}`);
        }
      }
    }
  });
  return MBIDToUrlMap;
};

const getMetaInfo = async ({ artist, album }) => {
  const searchParams = new URLSearchParams();
  searchParams.set("api_key", LASTFMAPIKEY);
  searchParams.set("artist", artist);
  searchParams.set("format", "json");
  searchParams.set("autoCorrect", "true");
  if (album) {
    searchParams.set("method", "album.getinfo");
    searchParams.set("album", album);
  } else {
    searchParams.set("method", "artist.getinfo");
  }
  const response = await fetch(
    `https://ws.audioscrobbler.com/2.0/?${searchParams}`
  );
  const json = await response.json();
  return json;
};


export const getFanArt = async (mbid) => {
  const response = await fetch(
    `https://webservice.fanart.tv/v3/music/${mbid}&?api_key=${FANARTAPIKEY}&format=json`
  );
  if (response.status === 200) {
    const json = await response.json();
    const { artistthumb } = json;
    if (artistthumb) {
      return artistthumb[0].url;
    }
  }
  throw Error("no art found in provider fanart");
};

export const getAudioDB = async (artist) => {
  const response = await fetch(
    `https://www.theaudiodb.com/api/v1/json/2/search.php?s=${encodeURIComponent(
      artist
    )}`
  );
  if (response.status === 200) {
    const json = await response.json();
    const { artists } = json;
    if (artists) {
      return artists[0].strArtistThumb || artists[0].strArtistFanart;
    }
  }
  throw Error("no art found in provider audiodb");
};

export const downloadImageForMBIDs = async (map) => {
  await asyncForEach(Array.from(map.keys()), async (key) => {
    const url = map.get(key);
    console.log(`downloading ${kleur.green(url)} ...`);
    const res = await fetch(url);
    writeBlob(key, res);
  });
}