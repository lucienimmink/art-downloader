import fetch from 'node-fetch';
import ora from 'ora';
import kleur from 'kleur';
import dotenv from 'dotenv';
dotenv.config();

import { asyncForEach, sleep } from './helpers.js';
import { writeBlob, isAlreadyDownloaded } from './write.js';

const { LASTFMAPIKEY, FANARTAPIKEY } = process.env;

export const getMBIDForArtists = async map => {
  const start = new Date().getTime();
  const percent = Math.ceil(map.size / 100);
  let count = 0;
  let fetched = 0;
  const spinner = ora('Fetching meta data for artists').start();
  await asyncForEach(Array.from(map.keys()), async key => {
    const hasMBID = !!map.get(key);
    if (!hasMBID) {
      try {
        const { artist } = await getMetaInfo({ artist: key });
        let mbid = artist?.mbid;
        if (!mbid) {
          mbid = await getMBID(key)
        }
        map.set(key, mbid);
        fetched++;
      } catch (e) {
        console.log(
          `encountered an error while getting meta-info for ${kleur.yellow(
            key
          )} with MBID ${kleur.yellow(mbid)}`
        );
      }
    }
    count++;
    if (count % percent === 0) {
      spinner.color = 'yellow';
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

export const getArtForArtists = async map => {
  const MBIDToUrlMap = new Map();
  const ArtistsWithoutArt = new Map();
  const start = new Date().getTime();
  const percent = Math.ceil(map.size / 100);
  let count = 0;
  let fetched = 0;
  const spinner = ora('Fetching album art for artists').start();
  await asyncForEach(Array.from(map.keys()), async key => {
    const mbid = map.get(key);
    const hasMBID = !!mbid;
    if (hasMBID && !(await isAlreadyDownloaded(mbid))) {
      try {
        const url = await getFanArt(mbid);
        fetched++;
        MBIDToUrlMap.set(mbid, url);
      } catch (e) {
        // not found in FanArt
        try {
          const url = await getAudioDB(key);
          fetched++;
          MBIDToUrlMap.set(mbid, url);
        } catch (e) {
          // not found in AudioDB
          ArtistsWithoutArt.set(key, mbid);
        }
      }
    }
    count++;
    if (count % percent === 0) {
      spinner.color = 'yellow';
      spinner.text = `Fetching album art for artists - ${
        count / percent
      }% done`;
    }
  });
  const stop = new Date().getTime();
  spinner.stop();
  console.log(
    `Fetched ${kleur.green(fetched)} art in ${kleur.yellow(
      (stop - start) / 1000
    )}s`
  );
  return { MBIDToUrlMap, ArtistsWithoutArt };
};

const getMetaInfo = async ({ artist, album }) => {
  const searchParams = new URLSearchParams();
  searchParams.set('api_key', LASTFMAPIKEY);
  searchParams.set('artist', artist);
  searchParams.set('format', 'json');
  searchParams.set('autoCorrect', 'true');
  if (album) {
    searchParams.set('method', 'album.getinfo');
    searchParams.set('album', album);
  } else {
    searchParams.set('method', 'artist.getinfo');
  }
  const response = await fetch(
    `https://ws.audioscrobbler.com/2.0/?${searchParams}`
  );
  const json = await response.json();
  return json;
};

const getMBID = async (artist) => {
  await sleep(1000); // https://wiki.musicbrainz.org/MusicBrainz_API/Rate_Limiting
  const searchParams = new URLSearchParams();
  searchParams.set("fmt", "json");
  searchParams.set("query", artist);
  const response = await fetch(`https://musicbrainz.org/ws/2/artist/?${searchParams}`);
  const { artists } = await response.json();
  return artists[0].id;
}

export const getFanArt = async mbid => {
  await sleep(200); // rate-limit :(
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
  throw Error('no art found in provider fanart');
};

export const getAudioDB = async artist => {
  await sleep(1500);
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
  if (response.status === 429) {
    // or whatever status it is
    // we are being rate-limited; let's wait a while
    console.log(kleur.bgRed('Rate limited, sleeping for a while'));
    await sleep(1000 * 60); // 1 minute should do it?
    // retry this
    return getAudioDB(artist);
  }
  throw Error('no art found in provider audiodb');
};

export const downloadImageForMBIDs = async map => {
  await asyncForEach(Array.from(map.keys()), async key => {
    const url = map.get(key);
    if (url) {
      sleep(200);
      console.log(`downloading ${kleur.green(url)} ...`);
      const res = await fetch(url);
      writeBlob(key, res);
    }
  });
};
