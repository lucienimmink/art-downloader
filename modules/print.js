import Table from 'cli-table';
import kleur from 'kleur';
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

export const printTable = (list, type) => {
  if (Object.keys(list).length === 0) {
    console.log(kleur.green(texts[type].empty));
    return;
  }
  console.log(
    kleur.yellow(texts[type].title + ' (' + Object.keys(list).length + ')'),
  );
  if (type === 'artists-without-art' || type === 'artists') {
    printArtistTable(list);
  } else if (type === 'albums') {
    printAlbumTable(list);
  }
};

const printArtistTable = list => {
  const table = new Table({
    head: ['Artist', 'MBID'],
  });
  for (const artist of Object.keys(list).sort(sortArtists)) {
    table.push([artist, list[artist]]);
  }
  console.log(table.toString());
};

const printAlbumTable = list => {
  const table = new Table({
    head: ['Artist', 'Album', 'Art URL'],
    colWidths: [30, 30, 84],
  });
  for (const album of Object.keys(list).sort(sortAlbums)) {
    const [artist, albumName] = album.split('|||');
    const { url, mbid } = JSON.parse(list[album]);
    table.push([artist, albumName, url || mbid || 'unknown']);
  }
  console.log(table.toString());
};
