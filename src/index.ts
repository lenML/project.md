import { Command } from 'commander';

const program = new Command();

program
  .name('pdm')
  .description('markdown-based project manager')
  .version('0.1.0');

program.parse(process.argv);
