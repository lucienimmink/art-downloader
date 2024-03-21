import fetch from 'node-fetch';
import ora from 'ora';
import kleur from 'kleur';
import dotenv from 'dotenv';
dotenv.config();

import { asyncForEach, sleep } from './helpers.js';
import { writeBlob, isAlreadyDownloaded } from './write.js';
import timeSpan from './hms.js';

const { LASTFMAPIKEY, FANARTAPIKEY } = process.env;

const getMBIDForArtists = async (map, isTurbo = false) => {
  const start = new Date().getTime();
  const percent = Math.ceil(map.size / 100);
  let count = 0;
  let fetched = 0;
  const newMBIDs = new Map();
  const spinner = ora(`\tFetching MBIDs: ${kleur.green(map.size)}`).start();
  await asyncForEach(Array.from(map.keys()), async key => {
    const hasMBID = !!map.get(key);
    if (!hasMBID) {
      try {
        const { artist } = await getMetaInfo({ artist: key });
        let mbid = artist?.mbid;
        if (!mbid) {
          mbid = await getArtistMBID(key);
        }
        map.set(key, mbid);
        newMBIDs.set(key, mbid);
        fetched++;
      } catch (e) {
        console.log(
          `\n\t\tEncountered an error while getting meta-info for ${kleur.yellow(
            key,
          )} with MBID ${kleur.yellow(mbid)}`,
        );
      }
    }
    count++;
    if (count % percent === 0) {
      spinner.color = 'yellow';
      spinner.text = `\tFetching MBIDs: ${kleur.green(map.size)} - ${
        count / percent
      }% done`;
    }
  });
  const stop = new Date().getTime();
  spinner.stop();
  console.log(
    `\tFetched MBID${fetched !== 1 ? 's' : ''}: ${kleur.green(
      fetched,
    )} in ${kleur.yellow(timeSpan(stop - start))}`,
  );
  return newMBIDs;
};

const getMBIDForAlbums = async (map, isTurbo = false) => {
  const start = new Date().getTime();
  const percent = Math.ceil(map.size / 100);
  let count = 0;
  let fetched = 0;
  const newMBIDs = new Map();
  const spinner = ora(`\tFetching MBIDs: ${kleur.green(map.size)}`).start();
  await asyncForEach(Array.from(map.keys()), async key => {
    const split = key.split('|||');
    const artist = split[0];
    const salbum = split[1];
    const hasMBID = !!map.get(key);
    if (!hasMBID) {
      try {
        const { album } = await getMetaInfo({ artist, album: salbum });
        const images = album?.image;
        const url = album?.image?.[images?.length - 1]?.['#text'];
        let mbid = album?.mbid;
        map.set(key, JSON.stringify({ mbid, url }));
        newMBIDs.set(key, JSON.stringify({ mbid, url }));
        fetched++;
      } catch (e) {
        console.log(
          `\n\t\tEncountered an error while getting meta-info for ${kleur.yellow(
            artist,
          )} - ${kleur.yellow(salbum)}`,
        );
      }
    }
    count++;
    if (count % percent === 0) {
      spinner.color = 'yellow';
      spinner.text = `\tFetching MBIDs: ${kleur.green(map.size)} - ${
        count / percent
      }% done`;
    }
  });
  const stop = new Date().getTime();
  spinner.stop();
  console.log(
    `\tFetched MBID${fetched !== 1 ? 's' : ''}: ${kleur.green(
      fetched,
    )} in ${kleur.yellow(timeSpan(stop - start))}`,
  );
  return newMBIDs;
};

export const getMBID = async (map, type, isTurbo = false) => {
  switch (type) {
    case 'artists':
      return await getMBIDForArtists(map, isTurbo);
    case 'albums':
      return await getMBIDForAlbums(map, isTurbo);
    default:
      console.log(`\tCannot handle type ${kleur.red(type)}`);
      return new Map();
  }
};

export const getArtForArtists = async (map, isTurbo = false) => {
  const mBIDToUrlMap = new Map();
  const artistsWithoutArt = new Map();
  const start = new Date().getTime();
  const percent = Math.ceil(map.size / 100);
  let count = 0;
  let fetched = 0;
  const spinner = ora(
    `\tChecking cache and resolving URLs: ${kleur.green(map.size)}`,
  ).start();
  await asyncForEach(Array.from(map.keys()), async key => {
    const mbid = map.get(key);
    const hasMBID = !!mbid;
    if (hasMBID && !(await isAlreadyDownloaded(mbid))) {
      try {
        const url = await getFanArt(mbid);
        if (url) {
          fetched++;
          mBIDToUrlMap.set(mbid, url);
        } else {
          artistsWithoutArt.set(key, mbid);
        }
      } catch (e) {
        // not found in FanArt
        try {
          const url = await getAudioDB(key);
          if (url) {
            fetched++;
            mBIDToUrlMap.set(mbid, url);
          } else {
            artistsWithoutArt.set(key, mbid);
          }
        } catch (e) {
          // not found in AudioDB
          artistsWithoutArt.set(key, mbid);
        }
      }
    }
    count++;
    if (count % percent === 0) {
      spinner.color = 'yellow';
      spinner.text = `\tChecking cache and resolving URLs: ${kleur.yellow(
        count / percent,
      )}%`;
    }
  });
  const stop = new Date().getTime();
  spinner.stop();
  if (!isTurbo) {
    console.log(
      `\tChecking cache and resolving URLs: 
      \t\tCached: ${kleur.green(count - fetched)} 
      \t\tNew: ${kleur.green(fetched)}
      \t\tTime taken: ${kleur.yellow(timeSpan(stop - start))}`,
    );
  } else {
    console.log(
      `\tResolving URLs: 
      \t\tNew: ${kleur.green(fetched)}
      \t\tTime taken: ${kleur.yellow(timeSpan(stop - start))}`,
    );
  }
  return { mBIDToUrlMap, artistsWithoutArt };
};
export const getArtForAlbums = async (map, isTurbo = false) => {
  const mBIDToUrlMapForAlbums = new Map();
  const start = new Date().getTime();
  const percent = Math.ceil(map.size / 100);
  let count = 0;
  let fetch = 0;
  const spinner = ora(
    `\tChecking cache and resolving URLs: ${kleur.green(map.size)}`,
  ).start();

  await asyncForEach(Array.from(map.keys()), async key => {
    const json = map.get(key);
    const { mbid, url } = JSON.parse(json);
    const hasMBID = !!mbid;
    if (hasMBID && url && !(await isAlreadyDownloaded(mbid))) {
      mBIDToUrlMapForAlbums.set(mbid, url);
      fetch++;
    }
    count++;
    if (count % percent === 0) {
      spinner.color = 'yellow';
      spinner.text = `\tChecking cache and resolving URLs: ${kleur.yellow(
        count / percent,
      )}%`;
    }
  });
  const stop = new Date().getTime();
  spinner.stop();
  if (!isTurbo) {
    console.log(
      `\tChecking cache and resolving URLs: 
      \t\tCached: ${kleur.green(count - fetch)} 
      \t\tNew: ${kleur.green(fetch)}
      \t\tTime taken: ${kleur.yellow(timeSpan(stop - start))}`,
    );
  } else {
    console.log(
      `\tResolving URLs: 
      \t\tNew: ${kleur.green(fetch)}
      \t\tTime taken: ${kleur.yellow(timeSpan(stop - start))}`,
    );
  }
  return mBIDToUrlMapForAlbums;
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
    `https://ws.audioscrobbler.com/2.0/?${searchParams}`,
  );
  const json = await response.json();
  return json;
};

const getArtistMBID = async artist => {
  await sleep(1000); // https://wiki.musicbrainz.org/MusicBrainz_API/Rate_Limiting
  const searchParams = new URLSearchParams();
  searchParams.set('fmt', 'json');
  searchParams.set('query', artist);
  const response = await fetch(
    `https://musicbrainz.org/ws/2/artist/?${searchParams}`,
  );
  const { artists } = await response.json();
  return artists[0].id;
};

export const getFanArt = async mbid => {
  await sleep(200); // rate-limit :(
  const response = await fetch(
    `https://webservice.fanart.tv/v3/music/${mbid}&?api_key=${FANARTAPIKEY}&format=json`,
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
      artist,
    )}`,
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
      sleep(100);
      console.log(`\t\tDownloading: ${kleur.green(url)} ...`);
      const res = await fetch(url);
      writeBlob(key, res);
    }
  });
};
