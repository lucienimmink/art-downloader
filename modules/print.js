import Table from 'cli-table';
import { styleText } from 'node:util';
import { sortAlbums, sortArtists } from './helpers.js';

const texts = {
  'artists-without-art': {
    title: 'Artists without art:',
    empty: 'All artists have art!',
  },
  albums: {
    title: 'All albums:',
    empty: 'No albums found!',
  },
  artists: {
    title: 'All artists:',
    empty: 'No artists found!',
  },
};

export const printTable = (list, type, filter = '') => {
  if (Object.keys(list).length === 0) {
    console.log(styleText('green', texts[type].empty));
    return;
  }
  console.log(
    styleText(
      'yellow',
      texts[type].title + ' (' + Object.keys(list).length + ')',
    ),
  );
  if (type === 'artists-without-art' || type === 'artists') {
    printArtistTable(list, filter);
  } else if (type === 'albums') {
    printAlbumTable(list, filter);
  }
};

const printArtistTable = (list, filter) => {
  const table = new Table({
    head: ['Artist', 'MBID'],
  });
  for (const artist of Object.keys(list).sort(sortArtists)) {
    table.push([artist, list[artist]]);
  }
  console.log(table.toString());
};

const printAlbumTable = (list, filter) => {
  const table = new Table({
    head: ['Artist', 'Album', filter === 'unknown' ? 'MBID' : 'Art URL'],
    colWidths: [30, 30, 84],
  });
  for (const album of Object.keys(list).sort(sortAlbums)) {
    const [artist, albumName] = album.split('|||');
    const { url, mbid } = JSON.parse(list[album]);
    table.push([artist, albumName, url || mbid || 'unknown']);
  }
  console.log(table.toString());
};
