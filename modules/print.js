import Table from 'cli-table';
import kleur from 'kleur';
import dotenv from 'dotenv';
dotenv.config();

export const printTableArtistsWithoutArt = list => {
  if (Object.keys(list).length === 0) {
    console.log(kleur.green('All artists have art!'));
    return;
  }
  console.log(kleur.yellow('Artists without art:'));
  const table = new Table({
    head: ['Artist', 'MBID'],
  });
  for (const artist of Object.keys(list)) {
    table.push([artist, list[artist]]);
  }
  console.log(table.toString());
};
