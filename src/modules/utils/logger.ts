import chalk from 'chalk';

export interface Logger {
  info: (msg: string) => void;
  warn: (msg: string) => void;
  error: (msg: string, err?: Error) => void;
  debug: (msg: string) => void;
}

export class ConsoleLogger implements Logger {
  info(msg: string): void {
    console.log(chalk.cyan('[INFO]'), msg);
  }
  warn(msg: string): void {
    console.warn(chalk.yellow('[WARN]'), msg);
  }
  error(msg: string, err?: Error): void {
    console.error(chalk.red('[ERROR]'), msg, err ? `\n${err.stack ?? err.message}` : '');
  }
  debug(msg: string): void {
    if (process.env.DEBUG === '1') {
      console.debug(chalk.gray('[DEBUG]'), msg);
    }
  }
}
