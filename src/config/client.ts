import { has } from 'rambdax';
import { ICLIOptions, Syncify } from 'types';
import { upload } from 'modes/upload';
import { download } from 'modes/download';
import { build } from 'modes/build';
import { watch } from 'modes/watch';
import { metafields } from 'modes/metafields';
import { prompt } from 'cli/prompts';
import { readConfig } from 'config/config';
import { help } from 'cli/help';
import * as log from 'cli/logs';

/**
 * Client
 *
 * Determines how Syncify was initialized.
 * It will dispatch and construct the correct
 * configuration model accordingly.
 */
export async function client (options: ICLIOptions, callback?: typeof Syncify.hook) {

  if (has('_', options)) options._ = options._.slice(1);

  const config = await readConfig(options);

  //  console.log(config);

  if (config) {

    try {

      if (config.mode.vsc) {
        return null;
      } else if (config.mode.prompt) {
        return prompt(config);
      } else if (config.mode.build) {
        return build(config, callback);
      } else if (config.mode.watch) {
        return watch(config, callback);
      } else if (config.mode.upload) {
        return upload(config, callback);
      } else if (config.mode.download) {
        return download(config, callback);
      } else if (config.mode.metafields) {
        return metafields(config);
      } else if (config.mode.help) {
        return process.stdout.write(help);
      }

    } catch (error) {

      log.errors(error);

    }

  }
}
