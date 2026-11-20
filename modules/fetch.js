import fetch from 'node-fetch';
import ora from 'ora';
import { styleText } from 'node:util';
import { asyncForEach, sleep } from './helpers.js';
import { writeBlob, isAlreadyDownloaded, writeStatus } from './write.js';
import timeSpan from './hms.js';
import {
  getMetaInfo,
  getMBID as getArtistMBIDFromMusicBrainz,
} from './providers/metainfo.js';
import { fetchArtForArtist, fetchArtForAlbum } from './fetchArt.js';

const getDownloadRetryDelay = (retryAfter, attempt) => {
  if (retryAfter) {
    const seconds = Number(retryAfter);
    const retryAt = Number.isFinite(seconds)
      ? Date.now() + seconds * 1000
      : Date.parse(retryAfter);
    if (Number.isFinite(retryAt)) {
      return Math.min(Math.max(0, retryAt - Date.now()), 30_000);
    }
  }
  return 1000 * 2 ** attempt;
};

const getMBIDForArtists = async (map, isTurbo = false, daemonMode = false) => {
  const start = new Date().getTime();
  const percent = Math.ceil(map.size / 100);
  let count = 0;
  let fetched = 0;
  const newMBIDs = new Map();
  const spinner = daemonMode
    ? false
    : ora(
        `\tFetching MBIDs: ${styleText('green', map.size.toString())}`,
      ).start();
  await asyncForEach(Array.from(map.keys()), async key => {
    const hasMBID = !!map.get(key);
    if (!hasMBID) {
      try {
        const mbid = await getArtistMBIDFromMusicBrainz(key);
        if (!mbid) {
          const searchedProviders = process.env.LASTFMAPIKEY
            ? 'MusicBrainz or Last.fm'
            : 'MusicBrainz';
          console.warn(
            `\n\t\tNo artist MBID found for ${styleText('yellow', key)} in ${searchedProviders}`,
          );
        } else {
          map.set(key, mbid);
          newMBIDs.set(key, mbid);
          fetched++;
        }
      } catch (e) {
        console.warn(
          `\n\t\tFailed to resolve MBID for ${styleText(
            'yellow',
            key,
          )}: ${styleText('yellow', e.message)}`,
        );
      }
    }
    count++;
    if (count % percent === 0) {
      if (!daemonMode) {
        spinner.color = 'yellow';
        spinner.text = `\tFetching MBIDs: ${styleText('green', map.size.toString())} - ${count / percent}% done`;
      }
      if (daemonMode)
        writeStatus({ artists: { total: map.size, done: count } });
    }
  });
  const stop = new Date().getTime();
  if (!daemonMode) spinner.stop();
  if (!daemonMode)
    console.log(
      `\tFetched MBID${fetched !== 1 ? 's' : ''}: ${styleText(
        'green',
        fetched.toString(),
      )} in ${styleText('yellow', timeSpan(stop - start))}`,
    );
  if (daemonMode) writeStatus({ artists: { time: timeSpan(stop - start) } });
  return newMBIDs;
};

const getMBIDForAlbums = async (map, isTurbo = false, daemonMode = false) => {
  const start = new Date().getTime();
  const percent = Math.ceil(map.size / 100);
  let count = 0;
  let fetched = 0;
  const newMBIDs = new Map();
  const spinner = daemonMode
    ? false
    : ora(
        `\tFetching MBIDs: ${styleText('green', map.size.toString())}`,
      ).start();
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
        console.warn(
          `\n\t\tEncountered an error while getting meta-info for album ${styleText(
            'yellow',
            `${artist} - ${salbum}`,
          )}: ${styleText('yellow', e.message)}`,
        );
      }
    }
    count++;
    if (count % percent === 0) {
      if (!daemonMode) {
        spinner.color = 'yellow';
        spinner.text = `\tFetching MBIDs: ${styleText('green', map.size.toString())} - ${count / percent}% done`;
      }
      if (daemonMode) writeStatus({ albums: { total: map.size, done: count } });
    }
  });
  const stop = new Date().getTime();
  if (!daemonMode) spinner.stop();
  if (!daemonMode)
    console.log(
      `\tFetched MBID${fetched !== 1 ? 's' : ''}: ${styleText(
        'green',
        fetched.toString(),
      )} in ${styleText('yellow', timeSpan(stop - start))}`,
    );
  if (daemonMode) writeStatus({ albums: { time: timeSpan(stop - start) } });
  return newMBIDs;
};

export const getMBID = async (
  map,
  type,
  isTurbo = false,
  daemonMode = false,
) => {
  switch (type) {
    case 'artists':
      return await getMBIDForArtists(map, isTurbo, daemonMode);
    case 'albums':
      return await getMBIDForAlbums(map, isTurbo, daemonMode);
    default:
      console.warn(`\tCannot handle type ${styleText('red', type)}`);
      return new Map();
  }
};

export const getArtForArtists = async (
  map,
  isTurbo = false,
  daemonMode = false,
) => {
  const mBIDToUrlMap = new Map();
  const artistsWithoutArt = new Map();
  const start = new Date().getTime();
  const percent = Math.ceil(map.size / 100);
  let count = 0;
  let fetched = 0;
  const spinner = daemonMode
    ? null
    : ora(
        `\tChecking cache and resolving URLs: ${styleText('green', map.size.toString())}`,
      ).start();
  await asyncForEach(Array.from(map.keys()), async key => {
    const mbid = map.get(key);
    const hasMBID = !!mbid;
    if (hasMBID && !(await isAlreadyDownloaded(mbid))) {
      try {
        const url = await fetchArtForArtist(key, mbid);
        fetched++;
        mBIDToUrlMap.set(mbid, url);
      } catch (ee) {
        artistsWithoutArt.set(key, mbid);
      }
    }
    count++;
    if (count % percent === 0) {
      if (!daemonMode) {
        spinner.color = 'yellow';
        spinner.text = `\tChecking cache and resolving URLs: ${styleText(
          'yellow',
          (count / percent).toString(),
        )}%`;
      }
      if (daemonMode) writeStatus({ artists: { art: map.size, done: count } });
    }
  });
  const stop = new Date().getTime();
  if (!daemonMode) spinner.stop();
  if (!isTurbo) {
    if (!daemonMode)
      console.log(
        `\tChecking cache and resolving URLs:
      \t\tCached: ${styleText('green', (count - fetched).toString())}
      \t\tNew: ${styleText('green', fetched.toString())}
      \t\tTime taken: ${styleText('yellow', timeSpan(stop - start))}`,
      );
  } else {
    if (!daemonMode)
      console.log(
        `\tResolving URLs:
      \t\tNew: ${styleText('green', fetched.toString())}
      \t\tTime taken: ${styleText('yellow', timeSpan(stop - start))}`,
      );
  }
  if (daemonMode)
    writeStatus({
      artists: {
        cached: count - fetched,
        new: fetched,
        time: timeSpan(stop - start),
      },
    });
  return { mBIDToUrlMap, artistsWithoutArt };
};
export const getArtForAlbums = async (
  map,
  isTurbo = false,
  daemonMode = false,
) => {
  const mBIDToUrlMapForAlbums = new Map();
  const albumsWithoutArt = new Map();
  const start = new Date().getTime();
  const percent = Math.ceil(map.size / 100);
  let count = 0;
  let fetch = 0;
  const spinner = daemonMode
    ? null
    : ora(
        `\tChecking cache and resolving URLs: ${styleText('green', map.size.toString())}`,
      ).start();

  await asyncForEach(Array.from(map.keys()), async key => {
    const json = map.get(key);
    let hasMBID = false;
    let mbid = null;
    let url = null;
    try {
      mbid = JSON.parse(json)?.mbid;
      url = JSON.parse(json)?.url;
      hasMBID = !!mbid;
    } catch (e) {
      console.warn(
        `\n\t\tEncountered an error while parsing meta-info for ${styleText(
          'yellow',
          key,
        )} with ${styleText('yellow', json)}`,
      );
    }
    if (hasMBID && url && !(await isAlreadyDownloaded(mbid))) {
      const artist = key.split('|||').shift();
      const album = key.split('|||').pop();
      try {
        const url = await fetchArtForAlbum({ artist, album, id: mbid });
        mBIDToUrlMapForAlbums.set(mbid, url);
        fetch++;
      } catch (ee) {
        albumsWithoutArt.set(key, mbid);
      }
    }
    count++;
    if (count % percent === 0) {
      if (!daemonMode) {
        spinner.color = 'yellow';
        spinner.text = `\tChecking cache and resolving URLs: ${styleText(
          'yellow',
          (count / percent).toString(),
        )}%`;
      }
      if (daemonMode) writeStatus({ albums: { art: map.size, done: count } });
    }
  });
  const stop = new Date().getTime();
  if (!daemonMode) spinner.stop();
  if (!isTurbo) {
    if (!daemonMode)
      console.log(
        `\tChecking cache and resolving URLs:
      \t\tCached: ${styleText('green', (count - fetch).toString())}
      \t\tNew: ${styleText('green', fetch.toString())}
      \t\tTime taken: ${styleText('yellow', timeSpan(stop - start))}`,
      );
  } else {
    if (!daemonMode)
      console.log(
        `\tResolving URLs:
      \t\tNew: ${styleText('green', fetch.toString())}
      \t\tTime taken: ${styleText('yellow', timeSpan(stop - start))}`,
      );
  }
  if (daemonMode)
    writeStatus({
      albums: {
        cached: count - fetch,
        new: fetch,
        time: timeSpan(stop - start),
      },
    });
  return { mBIDToUrlMapForAlbums, albumsWithoutArt };
};

export const downloadImageForMBIDs = async (map, daemonMode = false) => {
  await asyncForEach(Array.from(map.keys()), async key => {
    const url = map.get(key);
    if (url) {
      if (!daemonMode)
        console.log(`\t\tDownloading: ${styleText('green', url)} ...`);
      let downloaded = false;
      for (let attempt = 0; attempt < 4 && !downloaded; attempt++) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30_000);
        try {
          const res = await fetch(url, { signal: controller.signal });
          if (!res.ok) {
            const error = new Error(`Image server returned HTTP ${res.status}`);
            error.status = res.status;
            error.retryAfter = res.headers.get('retry-after');
            res.body?.destroy();
            throw error;
          }
          await writeBlob(key, res, url);
          downloaded = true;
        } catch (error) {
          const retryable =
            [408, 429, 500, 502, 503, 504].includes(error.status) ||
            [
              'ECONNRESET',
              'ETIMEDOUT',
              'ECONNREFUSED',
              'EPIPE',
              'EAI_AGAIN',
            ].includes(error.code) ||
            error.name === 'AbortError';
          if (!retryable || attempt === 3) {
            console.warn(
              `\n\t\tFailed to download artwork ${styleText('yellow', key)}: ${styleText('yellow', error.message)}`,
            );
            break;
          }

          await sleep(getDownloadRetryDelay(error.retryAfter, attempt));
        } finally {
          clearTimeout(timeout);
        }
      }
    }
  });
};
