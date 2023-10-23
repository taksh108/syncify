/* eslint-disable prefer-promise-reject-errors */
/* eslint-disable n/handle-callback-err */
import { EventEmitter } from 'node:events';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { writeFile, readFile } from 'fs-extra';
import zlib from 'node:zlib';
import strip from 'strip-json-comments';
import { assign, create, toBuffer, toString } from './native';
import { UNITS } from 'syncify:const';
import { COL, DSH } from 'syncify:symbol';
import { bold } from 'syncify:colors';

/**
 * Whether property is in object
 *
 * @param prop The object property to check
 * @param object The object
 */
export function has <T extends object> (prop: keyof T | string, object: T): boolean {

  return prop in object;

}

/**
 * Whether property is in object
 *
 * @param prop The object property to check
 * @param object The object
 */
export function hasProp <T extends object> (object: T): (prop: keyof T) => boolean {

  return (prop) => prop in object;

}

export function getChunk (array: any[], perChunk: number = 2) {

  return array.reduce((acc, item, index) => {

    const ci = Math.floor(index / perChunk); // chunk index

    if (!acc[ci]) acc[ci] = []; // start a new chunk
    acc[ci].push(item);
    return acc;

  }, []);

}

/**
 * Event emitter instance
 */
export const event = new EventEmitter();

export function ws (array: any[] | object, prop: string = null) {

  let size: number = 0;

  if (isArray(array)) {
    for (const item of array) {
      if (prop) {
        if (item[prop].length > size) size = item[prop].length;
      } else {
        if (item.length > size) size = item.length;
      }
    }
  } else {
    for (const item in array) if (item.length > size) size = item.length;
  }

  size = size + 1;

  return function curried (string: string | number) {
    const n = isString(string) ? size - string.length : size - string;
    return n < 1 ? WSP : WSP.repeat(n);
  };

}

/**
 * Create a null prototype object
 *
 * @param input The object to assign (optional)
 */
export function object <T = any> (input?: T): T {

  return input
    ? assign(create(null), input)
    : create(null);

}

/**
 * Detect ANSI Codes
 *
 * Returns the regex expression
 *
 * @param string The string to detect ANSI occurances
 * @param option Whether or not to apply `g` flag
 */
export function detect (string: string, { onlyFirst = false } = {}) {

  const ansi = string.match(new RegExp([
    '[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]+)*|[a-zA-Z\\d]+(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)',
    '(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-nq-uy=><~]))'
  ].join('|'), onlyFirst ? undefined : 'g'));

  return ansi !== null ? ansi : false;
}

/**
 * Join a string together with a single space character
 *
 * @param input The string input to join
 */
export function glueString (...input: string[]) {

  return input.join(WSP);

}

/**
 * Join an array or ...spread together
 *
 * @param input The string input to join (defaults to `''` NIL)
 */
export function glue (...input: [ string[] ] | string[]) {

  return isArray(input[0]) ? input[0].join(NIL) : input.join(NIL);

}

export function checksum (input: string | Buffer) {

  return createHash('md5').update(input).digest('hex');

}

/**
 * JSONC
 *
 * Strip JSON Comments
 *
 * @param data JSON content in string form
 */
export function jsonc <T> (data: string): T {

  if (strip(data).trim() === NIL) return <T>{};

  try {
    return JSON.parse(strip(data).trim());
  } catch (e) {
    throw new Error(e);
  }
}

/**
 * File Kind
 *
 * Returns a grouping reference name according to file extensio
 *
 * @param ext The file extension
 */
export function fileKind (ext: string) {

  // Remove the . if passed
  if (ext.charCodeAt(0) === 46) ext = ext.slice(1);

  switch (ext) {
    case 'webm':
    case 'mpg':
    case 'mp2':
    case 'mpeg':
    case 'mpe':
    case 'mpv':
    case 'ogg':
    case 'm4p':
    case 'm4v':
    case 'avi':
    case 'wmv':
    case 'mov':
    case 'qt':
    case 'flv':
    case 'swf':
    case 'avchd': return 'video';

    case 'm4a':
    case '3gp':
    case '3g2':
    case 'aiff':
    case 'amr':
    case 'mp3':
    case 'wav': return 'audio';
  }

};

/**

 * Converts string input to a handle
 *
 * @param string The string to convert
 * @example 'foo:bar_baz 10' => 'foo-bar-baz-10'
 */
export function handleize (string: string) {

  return string
  .toLowerCase()
  .replace(/[^a-z0-9_:]+/g, '-')
  .replace(/-$/, '')
  .replace(/^-/, '');

}

/**
 * Adds an `s` to the end of a word if length is more than 1
 *
 * @param word The word to pluralize
 * @param size The length to determine, if `undefined` will measure `word`
 * @param zero Whether a length of `0` should be plural (defaults to `false`)
 */
export function plural (word: string, size: number, zero = false) {

  if (size >= 2) {
    return word[word.length - 1] !== 's' ? `${word}s` : word;
  } else {
    return word[word.length - 1] !== 's' ? word : word.slice(0, -1);
  }

}

/**
 * Sanatizes the log message passed. Converts a `Buffer`, `number`, `object`,
 * `boolean` or an `array` type to a readable string.
 *
 * @param message Input string to sanitize
 * @example
 * sanitize(true) => 'true'
 * sanitize({ x: 1 }) => '{"x":1}'
 * sanitize(1000) => '1000'
 */
export function sanitize (message: number | boolean | string | Buffer | object | any[]): string {

  if (isBuffer(message)) return message.toString();
  if (isObject(message) || isArray(message)) return JSON.stringify(message);
  if (isBoolean(message) || isNumber(message)) return `${message}`;

  return isString(message) ? message : String(message);

};

/**
 * As a temporary workaround for Jest's lack of stable ESM support, we fallback to require
 * if we're in a Jest environment.
 *
 * See https://github.com/vitejs/vite/pull/5197#issuecomment-938054077
 *
 * @param file File path to import.
 * @param format The import format, e.g: `esm`
 */
export async function dynamicImport (id: string, { format }: { format: string }) {

  if (format === 'esm') {

    return (file: string) => import(file);

  } else {

    return getImport(id);

  }

};

/**
 * Small helper for determining how an external dependency should
 * be resolved, returning an import resolver.
 *
 * @param name The import pkg or path
 */
export function getImport <T> (name: string): T {

  if (isFunction(require)) return require(name);

  // @ts-expect-error
  return createRequire(import.meta.url)(name);

}

/**
 * Infer JavaScript loader (used for esbuild related logic)
 *
 * @param ext The JS file extension, e.g: `.mjs`, `.js` etc
 */
export function inferLoader <T> (ext: string): T {

  if (ext === '.mjs' || ext === '.cjs') return 'js' as T;

  return ext.slice(1) as T;

}

/**
 * Capitlalize the first letter of a string.
 *
 * @param value The word to upcase
 * @example 'title' => 'Title'
 */
export function toUpcase <T extends string> (value: T) {

  return value.charAt(0).toUpperCase() + value.slice(1);

};

/**
 * Helper which runs `byteConvert` and `byteSize` to return readable
 * size string.
 *
 * @param value Either number of bytes of string input
 */
export function getSizeStr (value: string | number) {

  return typeof value === 'number'
    ? byteConvert(value)
    : byteConvert(byteSize(value));
}

/**
 * Returns the byte size of a string value. Use the `getSizeStr()` utility
 * to return a readable string.
 *
 * @param string The string to determine
 */
export function byteSize (string: string | Buffer): number {

  return isString(string)
    ? toBuffer(string).toString().length
    : string.toString().length;

};

/**
 * Converts byte size to killobyte, megabyte, gigabyte or terrabyte
 *
 * @param bytes The bytes number to convert
 * @example 1000 => '1kb'
 */
export function byteConvert (bytes: number): string {

  if (bytes === 0) return '0b';

  const size = parseInt(`${Math.floor(Math.log(bytes) / Math.log(1024))}`, 10);

  return size === 0
    ? `${bold(String(bytes))}${(UNITS[size])}`
    : `${bold((bytes / 1024 ** size).toFixed(1))}${(UNITS[size])}`;
};

/**
 * Returns an object containing size analysis of a string.
 * Requires a `beforeSize` value be provided to perform diff analysis
 *
 * @param content The content to measure
 * @param beforeSize The size to compare
 */
export function fileSize (content: string | Buffer, beforeSize: number) {

  const size = byteSize(content);
  const gzip = byteConvert(zlib.gzipSync(content).length);
  const before = byteConvert(beforeSize);
  const after = byteConvert(size);
  const saved = byteConvert(beforeSize - size);

  return {
    isSmaller: (size > beforeSize || (size === beforeSize)),
    gzip,
    before,
    after,
    saved
  };
};

/**
 * Converts milisecond time to a readable string
 *
 * @param ms The miliseconds to convert
 */
export function convertTimer (ms: number) {

  const m = Math.floor(ms / 60000);
  const s = ((ms % 60000) / 1000).toFixed(0);

  return m > 0 ? (m + 'min' + (Number(s) < 10 ? '0' : '') + s) : s;

};

/**
 * Return the current time/date - This is console specific and
 * will write ANSI colors
 *
 * @example
 * '01:59:20'
 */
export function getTime () {

  const now = new Date();
  const hur = now.getHours();
  const min = now.getMinutes();
  const sec = now.getSeconds();

  return (
    (hur < 10 ? `0${hur}` : hur) +
    COL + (min < 10 ? `0${min}` : min) +
    COL + (sec < 10 ? `0${sec}` : sec)
  );
};

/**
 * Return the current time/date - This is console specific and
 * will write ANSI colors
 *
 * @example
 * '01-01-2022 01:59:20'
 */
export function getDateTime () {

  const now = new Date();

  const d = now.getDate();
  const m = now.getMonth() + 1;
  const y = now.getFullYear();
  const hur = now.getHours();
  const min = now.getMinutes();
  const sec = now.getSeconds();

  return (
    (d < 10 ? `0${d + 1}` : `${d + 1}`) +
    DSH + (m < 10 ? `0${m}` : m) +
    DSH + y + WSP + (hur < 10 ? `0${hur}` : hur) +
    COL + (min < 10 ? `0${min}` : min) +
    COL + (sec < 10 ? `0${sec}` : sec)
  );

};

/**
 * Append an `st`, `nd`, `rd` or `th` to the end of a number
 *
 * @param i The number to suffix
 * @example
 * 1 => '1st'
 * 2 => '2nd'
 * 3 => '3rd'
 * 4 => '4th'
 */
export function addSuffix (number: number): string {

  const a = number % 10;
  const b = number % 100;

  return number + ((a === 1 && b !== 11)
    ? 'st'
    : (a === 2 && b !== 12) ? 'nd' : (a === 3 && b !== 13) ? 'rd' : 'th'
  );

}

export function kebabCase (string: string) {

  if (typeof string === 'string' && string.length > 0) {

    return string
    .match(/[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+/g)
    .join('-')
    .toLowerCase();

  }

  return string;
}

/**
 * Generate a random UUID
 *
 * @example
 * uuid() => 'x1s2n5'
 */
export function uuid (): string {

  return Math.random().toString(36).slice(2);

}

/**
 * Returns a promise resolved in the next event loop
 */
export function pNext () {

  return new Promise(resolve => {
    if (isFunction(setImmediate)) {
      setImmediate(resolve);
    } else {
      setTimeout(resolve);
    }
  });

}

export function debouncePromise<T extends unknown[]> (
  fn: (...args: T) => Promise<void>,
  delay: number,
  onError: (err: unknown) => void
) {

  let timeout: ReturnType<typeof setTimeout> | undefined;
  let transit: Promise<void> | undefined;
  let pending: (() => void) | undefined;

  return function debounced (...args: Parameters<typeof fn>) {
    if (transit) {
      pending = () => {
        debounced(...args);
        pending = undefined;
      };
    } else {
      if (timeout != null) clearTimeout(timeout);

      timeout = setTimeout(() => {
        timeout = undefined;
        transit = fn(...args).catch(onError).finally(() => {
          transit = undefined;
          if (pending) pending();
        });
      }, delay);
    }
  };
}

/* -------------------------------------------- */
/* TYPE AND VALUE CHECKS                        */
/* -------------------------------------------- */

/**
 * Check whether value is `undefined` or `null`
 */
export function isNil (input: any) {

  return input === undefined || input === null;

}

/**
 * Check whether value is even number
 */
export function isEven (number: number) {

  return number % 2 === 0;

}

/**
 * Check whether a Buffer or String is empty
 */
export function isEmptyString (input: Buffer | string) {

  if (isBuffer(input)) return input.toString().trim().length === 0;

  return input.trim().length === 0;

}

/**
 * Check whether a object or array is empty
 */
export function isEmpty (input: any) {

  if (isObject(input)) {
    for (const _ in input) return false; // eslint-disable-line no-unreachable-loop
    return true;
  }

  if (isArray(input)) return input.length === 0;
  if (isUndefined(input) || isNumber(input) || isNull(input) || isNaN(input)) return false;

  return !input;

}

/**
 * Check if param is an array type
 */
export function isArray <T extends any[]> (param: any): param is T {

  return toString.call(param).slice(8, -1) === 'Array';

}

/**
 * Check if param is an object type
 */
export function isObject <T extends object> (param: any): param is T {

  return toString.call(param).slice(8, -1) === 'Object';

}

/**
 * Check if param is a string type
 */
export function isString <T extends string> (param: any): param is T {

  return toString.call(param).slice(8, -1) === 'String';

}

/**
 * Check if param is a date type
 */
export function isDate <T extends Date> (param: any): param is T {

  return toString.call(param).slice(8, -1) === 'Date';

}

/**
 * Check if param is an regular expression type
 */
export function isRegex <T extends RegExp> (param: any): param is T {

  return toString.call(param).slice(8, -1) === 'RegExp';

}

/**
 * Check if param is a function type
 */
export function isFunction <T extends Function> (param: any): param is T {

  return toString.call(param).slice(8, -1) === 'Function';

}

/**
 * Check if param is a boolean type
 */
export function isBoolean <T extends boolean> (param: any): param is T {

  return toString.call(param).slice(8, -1) === 'Boolean';

}

/**
 * Check if param is a number type
 */
export function isNumber <T extends number> (param: any): param is T {

  return toString.call(param).slice(8, -1) === 'Number';

}

/**
 * Check if param is a number type
 */
export function isNaN <T extends number> (param: any): param is T {

  return Number.isNaN(param);

}

/**
 * Check if param is null type
 */
export function isNull <T extends null> (param: any): param is T {

  return toString.call(param).slice(8, -1) === 'Null';

}

/**
 * Check if param is a undefined type
 */
export function isUndefined <T extends undefined> (param: any): param is T {

  return toString.call(param).slice(8, -1) === 'Undefined';
}

/**
 * Check if param is Asynchronous type
 */
export function isAsync<T extends Promise<unknown>> (param: any): param is T {

  return toString.call(param).slice(8, -1) === 'AsyncFunction';

}

/**
 * Check if param is Buffer type
 */
export function isBuffer<T extends Buffer> (param: any): param is T {

  return Buffer.isBuffer(param);
}
