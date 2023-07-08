import { Config, ESBuildConfig, ScriptBundle, ScriptTransform, WatchBundle } from 'types';
import { join } from 'node:path';
import { has, isEmpty, isNil, omit } from 'rambdax';
import merge from 'mergerino';
import { getModules, readConfigFile } from '~utils/options';
import { warnOption, missingDependency, invalidError, typeError, throwError } from '~options/validate';
import { getResolvedPaths, getTransform, renameFile } from './utilities';
import { isArray } from '~utils/native';
import { bundle, processor } from '~config';
import { esbuildModule, esbuildBundle } from '~transform/script';
import { uuid } from '~utils/utils';
import * as u from '~utils/native';
import anymatch from 'anymatch';

// import { log } from '~log';

/**
 * Script Transform
 *
 * Normalizes and generates the configuration model which will
 * be used for script transformations using ESBuild.
 */
export async function setScriptOptions (config: Config) {

  if (!has('script', config.transforms)) return;
  if (config.transforms.script === false) return;

  const warn = warnOption('script transform option');

  const { esbuild } = processor;
  const { script } = config.transforms;

  esbuild.installed = getModules(bundle.pkg, 'esbuild');

  if (esbuild.installed) {

    const loaded = esbuildModule();

    if (!loaded) {
      throwError(
        'failed to import ESBuild',
        'Ensure you have installed esbuild'
      );
    }

    /** External `esbuild.config.js` file  */
    const esbuildConfigFile = await readConfigFile<ESBuildConfig>('esbuild.config');

    if (esbuildConfigFile !== null) {
      esbuild.file = esbuildConfigFile.path;
      esbuild.config = merge(esbuild.config, esbuildConfigFile.config);
    }

  } else {

    missingDependency('esbuild');

  }

  // Lets ensure that no excluded esbuild options were provided
  // on the processor configuration object
  if (has('entryPoints', esbuild.config)) {
    warn('processor option is not allowed and was omitted', 'entryPoints');
    delete esbuild.config.entryPoints;
  }

  // Provide tsconfig raw options
  //
  // const tsconfig = await getTSConfig(bundle.cwd);
  //
  // defineProperty(esbuild, 'tsconfig', {
  //   get () {
  //     return tsconfig;
  //   }
  // });

  const transforms = getTransform<ScriptTransform[]>(script, {
    addWatch: false,
    flatten: true
  });

  /**
   * Curry omitter for excluding all properties from
   * the `script` transform which are not esbuild related.
   * Some esbuild options are exposed per-script transform
   * for convenience sake, this fuction will retrive only this
   * which are relative to esbuild
   */
  const esbuildOptions = omit([
    'input',
    'watch',
    'rename',
    'snippet'
  ]);

  if (!has('absWorkingDir', esbuild.config)) {
    esbuild.config.absWorkingDir = bundle.cwd;
  }

  for (const transform of transforms) {

    const { snippet } = transform;

    /**
     * The Shopify request key directory
     */
    const keyDir = snippet ? 'snippets' : 'assets';

    /**
     * Rename file
     */
    const { name } = renameFile(transform.input as string, transform.rename); // Rename file

    let rename: string;

    if (!name.endsWith('.js') && !name.endsWith('.mjs')) {
      rename = name + '.js';
    } else if (name.endsWith('.cjs')) {
      invalidError('rename', 'file extension', name, '.js | .mjs');
    } else {
      rename = name;
    }

    if (snippet && !/\.liquid$/.test(rename)) rename = rename + '.liquid';

    /**
     * The script bundle to be added to the `bundle` model
     */
    const scriptBundle: ScriptBundle = {
      uuid: uuid(),
      snippet,
      input: transform.input as string,
      output: join(bundle.dirs.output, keyDir, rename),
      key: join(keyDir, rename),
      namespace: transform.snippet ? 'snippets' : 'assets',
      size: NaN,
      watch: null,
      watchCustom: null,
      esbuild: null
    };

    esbuild.config.outfile = scriptBundle.output;

    if (bundle.mode.watch) {
      (bundle.watch as WatchBundle).unwatch(scriptBundle.output);
    }

    if (has('esbuild', transform)) {
      if (u.isBoolean(transform.esbuild) || isNil(transform.esbuild)) {

        if (isEmpty(esbuildOptions)) {
          scriptBundle.esbuild = merge<any>(esbuild.config);
        } else {
          scriptBundle.esbuild = merge(esbuild.config, esbuildOptions);
        }

      } else if (typeof transform.esbuild === 'object') {

        for (const prop in [
          'entryPoints',
          'outdir',
          'watch',
          'absWorkingDir',
          'watch',
          'write',
          'logLevel',
          'incremental'
        ]) {
          if (prop === 'entryPoints' && has(prop, transform.esbuild)) {
            warn('Option is not allowed, use Syncify "input" instead', prop);
          } else if (prop === 'outdir' && has(prop, transform.esbuild)) {
            warn('Option is not allowed, Syncify will handle output', prop);
          } else if (prop === 'watch' && has(prop, transform.esbuild)) {
            warn('Option is not allowed, declare watch using Syncify', prop);
          } else if (has(prop, transform.esbuild)) {
            warn('Option is not allowed and will be ignored', prop);
          }
        }

        if (has('plugins', transform.esbuild) && has('plugins', esbuild.config)) {
          transform.esbuild.plugins.unshift(...esbuild.config.plugins);
        }

        if (isEmpty(esbuildOptions)) {
          scriptBundle.esbuild = merge<any>(esbuild.config, transform.esbuild);
        } else {
          scriptBundle.esbuild = merge<any>(esbuild.config, transform.esbuild, esbuildOptions);
        }

      } else {
        typeError({
          option: 'script',
          name: 'esbuild',
          provided: typeof transform.esbuild,
          expects: 'boolean | null | {}'
        });
      }

    } else {
      if (isEmpty(esbuildOptions)) {
        scriptBundle.esbuild = esbuild.config as ESBuildConfig;
      } else {
        scriptBundle.esbuild = merge(esbuild.config, esbuildOptions);
      }
    }

    scriptBundle.esbuild.entryPoints = [ scriptBundle.input as string ];

    if (bundle.mode.watch) {

      if (!has('watch', transform)) {

        scriptBundle.watch = new Set();

      } else {

        if (!isArray(transform.watch)) {
          typeError({
            option: 'script',
            name: 'watch',
            provided: transform.watch,
            expects: 'string[]'
          });
        }

        const watchers = getResolvedPaths<string[]>(transform.watch);
        scriptBundle.watchCustom = anymatch(watchers);
        scriptBundle.watch = new Set(watchers);

      }
    } else {

      scriptBundle.watch = new Set();

    }

    try {

      await esbuildBundle(scriptBundle);

    } catch (e) {

      // TODO - HANDLE RUNTIME ERRORS
      throw new Error(e);

    }

    if (bundle.mode.terse) {
      // @ts-expect-error
      scriptBundle.esbuild = merge(scriptBundle.esbuild, bundle.terser.script, {
        exclude: undefined
      });
    }

    bundle.script.push(scriptBundle);

  }

  esbuild.loaded = true;

}