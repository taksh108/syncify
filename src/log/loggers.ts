import type { File, Group, Theme } from 'types';
import { has, isEmpty } from 'rambdax';
import { bundle, warning } from '~config';
import { queue } from '~requests/queue';
import { addSuffix, sanitize, plural, toUpcase } from '~utils/utils';
import { error, isArray, log, nil, nl } from '~utils/native';
import { intercept } from '~cli/intercept';
import * as timer from '~utils/timer';
import * as errors from '~log/errors';
import * as c from '~cli/ansi';
import * as tui from '~log/tui';
import notifier from 'node-notifier';

/* -------------------------------------------- */
/* RE-EXPORTS                                   */
/* -------------------------------------------- */

export { default as update } from 'log-update';
export { start } from '~log/start';
export { clear, hline } from '~log/tui';
export { spinner } from '~log/spinner';
export { progress } from '~cli/progress';
export { log as out } from '~utils/native';

/* -------------------------------------------- */
/* LOCAL SCOPES                                 */
/* -------------------------------------------- */

/**
 * Upload stacks, maintains files being uploaded
 */
const uploads: Set<[string, string, string]> = new Set();

/**
 * Stdout/Stderr interception hook
 */
let listen: () => void = null;

/**
 * Whether or not we are in idle
 */
let idle: boolean = false;

/**
 * Current Filename
 */
let group: Group = 'Syncify';

/**
 * Current Filename
 */
let title: string = nil;

/**
 * Current URI
 */
let uri: string = nil;

/* -------------------------------------------- */
/* FUNCTIONS                                    */
/* -------------------------------------------- */

let ii = 1;
/**
 * Log Building - `neonCyan`
 *
 * @example '│ building → source/dir/file.ext'
 */
export function build (id: string, count: number, file: File | string) {

  const close = (title !== id);

  timer.start();

  // close previous group
  if (close) {
    log(tui.closer(group));
    ii = 0;
  }

  // clear if first run
  if (group === 'Syncify') tui.clear();

  // update group
  group = id;

  // open new group
  if (close) {
    log(tui.opener(group));
    nwl();
    log(c.line.gray + c.bold(`${count} ${toUpcase(id)}`));
    nwl();

    title = id;
  }

  nwl();
  log(tui.tree('top', c.neonCyan(typeof file === 'string' ? file : file.relative)));

};

/**
 * TUI Newline
 *
 * Inserts a newline _trunk_ character. Optionally pass
 * an empty string (ie: `''`) to insert a newline without
 * without c.line character
 *
 * `│`
 */
export function nwl (entry: '' | 'red' | 'yellow' | 'gray' | undefined = 'gray') {

  if (isEmpty(entry)) {
    log(nl);
  } else {
    log(c.line[entry]);
  }

}

/**
 * Log Error - `red`
 *
 * Equivalent of `console.error` but applies line prefix
 * and sanitizes the input. Does not apply operation prefix.
 *
 */
export function err (input: string | string[]) {

  if (isArray(input)) {
    error(c.red(input.map(text => c.line.red + sanitize(text)).join(nl)));
  } else {
    error(c.line.red + sanitize(input));
  }
}

/**
 * Log Write
 *
 * Writes a standard stdout message with line prefix.
 *
 * @example '│ lorem ipsum'
 */
export function write (input: string | string[]) {

  if (isArray(input)) {
    log(input.map(text => c.line.gray + sanitize(text)).join(nl));
  } else {
    log(c.line.gray + sanitize(input));
  }
}

/**
 * External Handling - `cyan`
 *
 * @example '│ external → operation'
 */
export function external (operation: string) {

  log(tui.suffix('cyan', 'external', operation));

};

/**
 * Hook
 *
 * Listens on `stdout` and Intercepts logs messages.
 * Maintains a reference of warning/stdout invoked by different processes.
 */
export function hook (name: string) {

  if (warning.current !== name) warning.current = name;

  if (!has(name, warning.process)) {
    warning.current = name;
    warning.process[name] = new Set();
  }

  listen = intercept((stream, data) => {

    if (data.charCodeAt(0) === 9474) {
      process[stream].write(data);
    } else {

      warning.count += 1;
      const text = data.split('\n');

      while (text.length !== 0) {
        warning.process[name].add(`${c.yellowBright(text.shift().trimStart())}`);
      }
    }

  });

};

/**
 * Unhook
 *
 * Removes log listener and prints intercepted messages.
 * Captured logs can be printed based on `stdin` input.
 */
export function unhook () {

  listen();
  listen = null;

};

/**
 * New Group
 *
 * Changes the log group
 *
 * @example
 * │
 * └─ Name ~ 01:59:20
 */
export function newGroup (name: string, clear = false) {

  // close previous group
  log(tui.closer(group));

  // do not clear if first run
  if (clear) tui.clear();

  log(tui.opener(name));

  group = name;

  nwl();

}

/**
 * Log Changed - `neonCyan`
 *
 * @example '│ changed → source/dir/file.ext'
 */
export function changed (file: File) {

  const close = (title !== file.relative);

  timer.start();

  // close previous group
  if (close) log(tui.closer(group));

  // do not clear if first run
  if (group !== 'Syncify' && close) tui.clear();

  // update group
  group = file.namespace;

  // open new group
  if (close) {
    tui.clear();
    log(tui.opener(file.kind));
    title = file.relative;
  }

  // Create stack reference model
  if (!has(file.relative, warning)) warning[file.relative] = new Set();

  // Update the current records
  if (uri !== file.relative) uri = file.relative;

  if (bundle.mode.watch) {
    nwl();
    log(tui.suffix('neonCyan', 'changed', file.relative));
  }
};

/**
 * Log Uploaded - `neonGreen`
 *
 * @example '│ uploaded → theme → store.myshopify.com ~ 500ms'
 */
export function upload (theme: Theme) {

  if (bundle.mode.watch) {

    uploads.add([
      theme.target,
      theme.store,
      timer.stop()
    ]);

    if (idle) return;

    idle = true;

    queue.onIdle().then(() => {

      for (const [ target, store, time ] of uploads) {
        log(tui.suffix('neonGreen', 'uploaded', `${c.bold(target)} → ${store}` + c.time(time)));
      }

      uploads.clear();
      idle = false;

    });

  } else {

    log(tui.suffix('neonGreen', 'uploaded', `${c.bold(theme.target)} → ${theme.store}` + c.time(timer.stop())));

  }

};

/**
 * Log Syncing - `magenta`
 *
 * @example '│ syncing → dir/file.ext'
 */
export function syncing (path: string) {

  if (warning.count > 0) {
    tui.suffix('yellowBright', 'warning', `${warning.count} ${plural('warning', warning.count)}`);
  }

  if (bundle.mode.hot) {

    log(tui.suffix('neonRouge', 'reloaded', `${c.bold('HOT RELOAD')}${c.time(timer.now())}`));
    log(tui.suffix('magentaBright', 'syncing', path));

    // when hot reloads hold off on logging queues
    if (queue.pending > 2) {
      log(tui.suffix('orange', 'queued', `${path} ~ ${c.bold(addSuffix(queue.pending))} in queue`));
    }

  } else {

    log(tui.suffix('magentaBright', 'syncing', path));

    if (queue.pending > 0) {

      log(tui.suffix('orange', 'queued', `${path} ~ ${c.bold(addSuffix(queue.pending))} in queue`));
    }
  }

};

/**
 * Log Process - `whiteBright`
 *
 * The `message` parameter spread accepts either a message and time
 * append or simply a time append.
 *
 * When both message and time are passed:
 *
 * ```js
 * '│ process → ESBuild ‣ lorem ipsum ~ 500ms'
 * ```
 *
 * @example '│ process → ESBuild ~ 500ms'
 */
export function process (name: string, ...message: [message?: string, time?: string]) {

  let time: string = message[0];
  let text: string = nil;

  if (message.length === 2) {
    text = ` ${c.CHV} ${message[0]}`;
    time = message[1];
  }

  log(tui.suffix('whiteBright', 'process', c.bold(name) + text + c.time(time)));

};

/**
 * Log Generate `whiteBright`
 *
 * @example '│ exported → Snippet → file.js.liquid'
 */
export function exported (file: string) {

  log(tui.suffix('whiteBright', 'exports', file));

};

/**
 * Log Transfrom `whiteBright`
 *
 * ```
 * │  src/scripts/snippet.ts
 * │  └┐
 * │   ├→ transform → ESM bundle → 72.8kb
 * │   ├→ transform → exported as snippet
 * │  ┌┘
 * │  src/scripts/snippet.ts
 * ```
 *
 * @example '│ importer → source/dir/file.ext'
 */
export function importer (message: string) {

  if (!bundle.mode.build) {
    log(tui.suffix('lavender', 'importer', message));
  }
};

/**
 * Log Transfrom `whiteBright`
 *
 * @example '│ transform → source/dir/file.ext'
 */
export function transform (message: string) {

  log(tui.suffix('whiteBright', 'transform', message));

};

/**
 * TUI Warning - `orange`
 *
 * @example '│ retrying → dir/file.ext → theme ~ store.myshopify.com'
 */
export function retrying (file: string, theme: Theme) {

  log(tui.suffix('orange', 'retrying', `${file} → ${theme.target} ${c.gray(`~ ${theme.store}`)}`));

}

/**
 * Log Deleted - `blueBright`
 *
 * @example '│ deleted → dir/filename.ext → theme ~ store.myshopify.com'
 */
export function deleted (file: string, theme: Theme) {

  log(tui.suffix('blueBright', 'deleted', `${file} → ${theme.target} ${c.gray(`~ ${theme.store}`)}`));

};

/**
 * Log Minified - `whiteBright`
 *
 * @example '│ minified → CSS 200kb → 120kb ~ saved 80kb'
 */
export function minified (kind: string, before: string, after: string, saved: string) {

  const suffix = kind
    ? `${c.bold(kind)} ${c.ARR} ${before} ${c.ARL} ${after} ${c.gray(`~ saved ${saved}`)}`
    : `${before} ${c.ARL} ${after} ${c.gray(`~ saved ${saved}`)}`;

  log(tui.suffix('whiteBright', 'minified', suffix));

};

/**
 * Log Reloaded - `magentaBright`
 *
 * @example '│ reloaded → section → dir/file.ext ~ 500ms'
 */
export function reloaded (path: string, time: string) {

  log(tui.suffix('whiteBright', 'reloaded', path + time));

};

/**
 * Log Skipped - `gray`
 *
 * @example '│ skipped → dir/file.ext'
 */
export function skipped (file: File | string, reason: string) {

  log(tui.suffix('gray', 'skipped', `${typeof file === 'string' ? file : file.key} ~ ${reason}`));

};

/**
 * Log Warnings - `yellowBright`
 *
 * @example '│ ignored → dir/file.ext'
 */
export function ignored (path: string) {

  log(tui.suffix('gray', 'ignored', path));

};

/**
 * Log Invalid - `red`
 *
 * @example '│ invalid → dir/file.ext'
 */
export function invalid (path: string) {

  log(tui.suffix('red', 'invalid', path));

  const notification = notifier.notify({
    title: 'Syncify Error',
    sound: 'Pop',
    open: path,
    subtitle: path,
    message: 'Invalid error'
  });

  notification.notify();

};

/**
 * Log Failed - `red`
 *
 * @example '│ failed → dir/file.ext'
 */
export function failed (path: string) {

  log(tui.suffix('red', 'failed', path));

  const notification = notifier.notify({
    title: 'Syncify Error',
    sound: 'Pop',
    open: path,
    subtitle: path,
    message: 'Request failed'
  });

  notification.notify();

};

/**
 * Log Failed - `red`
 *
 * @example '│ failed → dir/file.ext'
 */
export function throws (data: string) {

  throw new Error(data);

};

/**
 * Spawn Logging
 *
 * This function is responsible for spawned logs and also
 * informs about invoked spawned processes, which is not ideal
 * but suffices (for now).
 */
export function spawn (name: string) {

  return (...message: string[]) => {

    if (!bundle.spawn.invoked) bundle.spawn.invoked = true;

    if (group !== 'Spawn') {

      log(tui.closer(group));

      // do not clear if first run
      if (group !== 'Syncify') tui.clear();

      log(tui.opener('Spawn'));

      // update name reference
      group = 'Spawn';

    }

    if (title !== name) {

      log(tui.message('pink', name));

      // update spawn process title
      title = name;

    }

    errors.spawn(sanitize(message.shift()));
  };

};
