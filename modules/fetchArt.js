import { config as albumConfig } from './providers/album/config.js';
import { config as artistConfig } from './providers/artist/config.js';
import { getMBID, getMetaInfo } from './providers/metainfo.js';
import { populate } from './providers/populate.js';

const fetchArtForArtist = async (artist, id) => {
  const album = '';
  let iid;
  if (id) {
    iid = { mbid: id, artist };
  } else {
    const json = await getMetaInfo({ artist, album });
    let {
      artist: { mbid },
    } = json;
    if (!mbid) {
      mbid = await getMBID(artist);
    }
    iid = { mbid, artist };
  }
  return await Promise.any(populate(iid, artistConfig));
};
const fetchArtForAlbum = async ({ artist, album, id }) => {
  let iid;
  if (id) {
    iid = { artist, album, mbid: id };
  } else {
    const json = await getMetaInfo({ artist, album });
    const {
      album: { mbid },
    } = json;
    iid = { artist, album, mbid };
  }
  return await Promise.any(populate(iid, albumConfig));
};

export { fetchArtForAlbum, fetchArtForArtist };
