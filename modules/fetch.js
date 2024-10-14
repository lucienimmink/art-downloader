import fetch from 'node-fetch';
import ora from 'ora';
import { styleText } from 'node:util';
import { asyncForEach, sleep } from './helpers.js';
import { writeBlob, isAlreadyDownloaded } from './write.js';
import timeSpan from './hms.js';
import { getMetaInfo } from './providers/metainfo.js';
import { fetchArtForArtist, fetchArtForAlbum } from './fetchArt.js';

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
        const { artist } = await getMetaInfo({ artist: key });
        let mbid = artist?.mbid;
        if (!mbid) {
          mbid = await getArtistMBID(key);
        }
        map.set(key, mbid);
        newMBIDs.set(key, mbid);
        fetched++;
      } catch (e) {
        if (!daemonMode)
          console.log(
            `\n\t\tEncountered an error while getting meta-info for ${styleText(
              'yellow',
              key,
            )} with ${styleText('yellow', key)}`,
          );
      }
    }
    count++;
    if (count % percent === 0) {
      if (!daemonMode) {
        spinner.color = 'yellow';
        spinner.text = `\tFetching MBIDs: ${styleText('green', map.size.toString())} - ${count / percent}% done`;
      }
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
          `\n\t\tEncountered an error while getting meta-info for ${styleText(
            'yellow',
            artist,
          )} - ${styleText('yellow', salbum)}`,
        );
      }
    }
    count++;
    if (count % percent === 0) {
      if (!daemonMode) {
        spinner.color = 'yellow';
        spinner.text = `\tFetching MBIDs: ${styleText('green', map.size.toString())} - ${count / percent}% done`;
      }
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
    const { mbid, url } = JSON.parse(json);
    const hasMBID = !!mbid;
    if (hasMBID && url && !(await isAlreadyDownloaded(mbid))) {
      const artist = key.split('|||').shift();
      const album = key.split('|||').pop();
      try {
        const url = await fetchArtForAlbum({ artist, album, mbid });
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
  return { mBIDToUrlMapForAlbums, albumsWithoutArt };
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

export const downloadImageForMBIDs = async (map, daemonMode = false) => {
  await asyncForEach(Array.from(map.keys()), async key => {
    const url = map.get(key);
    if (url) {
      sleep(100);
      if (!daemonMode)
        console.log(`\t\tDownloading: ${styleText('green', url)} ...`);
      const res = await fetch(url);
      writeBlob(key, res, url);
    }
  });
};
