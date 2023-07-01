import process from 'node:process';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

function exec (command: string, args: string[], shell?: boolean) {

  return execFileSync(command, args, {
    encoding: 'utf8',
    shell,
    stdio: [ 'ignore', 'pipe', 'ignore' ]
  }).trim();

}

function execNative (command: string, shell: boolean) {

  // @ts-expect-error
  const __dirname = dirname(fileURLToPath(import.meta.url));

  return exec(join(__dirname, command), [], shell).split(/\r?\n/);

}

const create = (columns: number | string, rows: number | string) => ({
  columns: Number.parseInt(columns as string, 10),
  rows: Number.parseInt(rows as string, 10)
});

export function size () {

  const { env, stdout, stderr } = process;

  if (stdout && stdout.columns && stdout.rows) return create(stdout.columns, stdout.rows);
  if (stderr && stderr.columns && stderr.rows) return create(stderr.columns, stderr.rows);

  // These values are static, so not the first choice
  if (env.COLUMNS && env.LINES) return create(env.COLUMNS, env.LINES);

  if (process.platform === 'win32') {

    try {

      // Binary: https://github.com/sindresorhus/win-term-size
      const size = execNative('vendor/windows/term-size.exe', false);
      if (size.length === 2) return create(size[0], size[1]);

    } catch {}

  } else {

    if (process.platform === 'darwin') {

      try {

        // Binary: https://github.com/sindresorhus/macos-term-size
        const size = execNative('vendor/macos/term-size', true);
        if (size.length === 2) return create(size[0], size[1]);

      } catch {}

    }

    // `resize` is preferred as it works even when all file descriptors are redirected
    // https://linux.die.net/man/1/resize
    try {

      const size = exec('resize', [ '-u' ]).match(/\d+/g);

      if (size.length === 2) return create(size[0], size[1]);

    } catch {}

    if (process.env.TERM) {
      try {

        const columns = exec('tput', [ 'cols' ]);
        const rows = exec('tput', [ 'lines' ]);

        if (columns && rows) return create(columns, rows);

      } catch {}
    }
  }

  return create(80, 24);
}