import type { Processor } from 'postcss';
import { IFile, IStyle, Syncify } from 'types';
import { compile, Logger } from 'sass';
import stringify from 'fast-safe-stringify';
import { readFile, writeFile } from 'fs-extra';
import { isNil } from 'rambdax';
import { lastPath } from '../shared/paths';
import { isFunction, isString, isUndefined, isBuffer } from 'shared/native';
import { byteConvert, byteSize } from '../shared/utils';
import { log, c, parse } from '../logger';
import { bundle, cache } from '../options/index';
import * as timer from '../process/timer';

/**
 * PostCSS Module
 */
let pcss: Processor = null;

/**
 * Loads PostCSS
 *
 * This is executed and the `postcss` variable is
 * assigned upon initialization.
 */
export const processer = (config: any) => {

  pcss = require('postcss')(config);

};

function write (file: IFile<IStyle>, cb: Syncify) {

  const scope = isFunction(cb) ? { ...file } : false;

  return async function (data: string) {

    if (isNil(data)) return null;

    let content: string;

    if (scope !== false) {

      const update = cb.apply({ ...file }, Buffer.from(data));

      if (isUndefined(update) || update === false) {
        content = data;
      } else if (isString(update) || isBuffer(update)) {
        content = update;
      }
    } else {
      content = data;
    }

    writeFile(file.output, data, (e) => e ? console.log(e) : null);

    if (bundle.mode.watch) {
      // log.info(`${c.white('created')} ${c.white.bold(file.key)} in ${c.white.bold(`${timer.stop()}`)}`);
    } else {
      log.info(`${c.cyan(file.key)} ${c.bold(byteConvert(byteSize(data)))}`);

    }

    return content;

  };
};

async function sass (file: IFile<IStyle>) {

  const { config } = file;

  if (file.ext === '.scss' || file.ext === '.sass') {

    if (bundle.mode.watch) timer.start();

    try {

      let warn: number = 0;

      const { css, sourceMap } = compile(config.input, {
        sourceMapIncludeSources: false,
        style: config.sass.style,
        quietDeps: config.sass.warnings,
        sourceMap: config.sass.sourcemap,
        loadPaths: config.sass.include,
        logger: config.sass.warnings ? Logger.silent : {
          debug: msg => console.log('DEBUG', msg),
          warn: (msg, opts) => {
            warn = warn + 1;
            if (config.sass.warnings) log.warn(parse.sassPetty(msg, opts.span, opts.stack));
          }
        }
      });

      if (config.sass.sourcemap) {
        writeFile(`${cache.styles.uri + file.base}.map`, stringify(sourceMap)).catch(e => log.warn(e));
      }

      if (bundle.mode.watch) {
        log.info(`${c.bold('sass')} to ${c.bold('css')} ${c.gray('~ ' + timer.stop())}`);
      }

      if (warn > 0) log.warn(`${c.bold('sass')} → ${c.bold(String(warn))} ${warn > 1 ? 'warnings' : 'warning'}`);

      return {
        css,
        map: sourceMap
      };

    } catch (e) {

      timer.clear();
      log.info(c.red.bold(`sass error in ${file.base}`));
      log.error(e);

      return null;

    }

  }

  try {

    // console.log(config, config.input)

    const css = await readFile(config.input);

    return { css: css.toString(), map: null };

  } catch (e) {

    log.warn(e);

    return null;

  }

};

/**
 * Post Processor
 *
 * Runs postcss on compiled SASS or CSS styles
 */
async function postcss (file: IFile<IStyle>, css: string, map: any) {

  const { config } = file;

  try {

    if (bundle.mode.watch) {
      // timer.start();
    }

    const result = await pcss.process(css, {
      from: config.rename,
      to: config.rename,
      map: map ? { prev: map, inline: false } : null
    });

    if (bundle.mode.watch) {
      log.info(`${c.bold('postcss')} ${c.gray(`~ ${timer.stop()}`)}`);
    }
    const warn = result.warnings();

    if (warn.length > 0) {
      log.warn(`${c.bold('postcss')} → ${c.bold(String(warn))} ${warn.length > 1 ? 'warnings' : 'warning'}`);
      log.warn(warn.join('\n'));
    }

    return result.toString();

  } catch (e) {

    timer.clear();
    log.error(c.red.bold(`postcss error in ${file.base}`));
    log.error(e);

    return null;

  }

};

/**
 * Create inline snippet
 */
function snippet (css: string) {

  return '<style>' + css + '</style>';

};

/**
 * SASS and PostCSS Compiler
 */
export async function styles (file: IFile<IStyle>, cb: Syncify): Promise<string> {

  if (bundle.mode.watch) timer.start();

  const output = write(file, cb);

  try {

    const out = await sass(file);

    if (isNil(pcss) || (
      file.config.postcss === false &&
      file.config.snippet === false)) {
      return output(out.css);
    }

    if (file.config.postcss) {
      const post = await postcss(file, out.css, out.map);
      if (post === null) return null;
      if (file.config.snippet) return output(snippet(post));
    }

    return file.config.snippet
      ? output(snippet(out.css))
      : output(out.css);

  } catch (e) {

    log.warn(e);

    return null;
  }

};
