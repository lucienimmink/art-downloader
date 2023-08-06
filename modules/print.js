import Table from 'cli-table';
import kleur from 'kleur';
import dotenv from 'dotenv';
dotenv.config();

export const printTableArtistsWithoutArt = list => {
  console.log(kleur.yellow('Artists without art:'));
  const table = new Table({
    head: ['Artist', 'MBID'],
  });
  for (const artist of Object.keys(list)) {
    table.push([artist, list[artist]]);
  }
  console.log(table.toString());
};
