import ansis from 'ansis';
import { toUpcase } from 'shared/helpers';
import { keys } from 'shared/native';
import { IConfig } from 'types';

/**
 * Grey Dimming - Applied to line tracers
 */
export const dim = ansis.hex('#2a2a2e');

/* -------------------------------------------- */
/* INTERFACE                                    */
/* -------------------------------------------- */

export const line = dim('│');

/**
 * Prepend - Prepends vertical line to texts
 *
 * ```
 * │ spawned message
 * │ spawned message
 * │ spawned message
 * ```
 */
export const prepend = (message: string) => message.replace(/^/gm, dim('│  ')) + '\n';

/**
 * Header - Prints a small overview of runing resource
 *
 * ```
 * ┌── Syncify v0.1.0.beta
 * │
 * │ Running in watch mode (production)
 * │ Syncing to 2 stores and 6 themes
 * │ Spawned 1 process in the asset pipline
 * │
 * │ Theme previews:
 * │
 * │  - https://shop.myshopify.com?preview_theme_id=123456789
 * │  - https://shop.myshopify.com?preview_theme_id=123456789
 * │  - https://shop.myshopify.com?preview_theme_id=123456789
 * │  - https://shop.myshopify.com?preview_theme_id=123456789
 * │
 * ```
 */
export const header = (config: IConfig) => {

  const color = ansis.cyan.bold;

  const stores = config.sync.stores.length > 1
    ? color(String(config.sync.stores.length)) + ' stores'
    : color(String(config.sync.stores.length)) + ' store';

  const themes = config.sync.themes.length > 1
    ? color(String(config.sync.themes.length)) + ' themes'
    : color(String(config.sync.themes.length)) + ' theme';

  const spawned = keys(config.spawns).length;
  const spawns = spawned > 1
    ? color(String(spawned)) + 'child processes'
    : color(String(spawned)) + 'child process';

  const width = config.sync.themes.reduce((size, { target }) => {
    if (target.length > size) size = target.length;
    return size;
  }, 0);

  const previews = config.sync.themes.map(({ id, domain, target }) => {

    const offset = width - target.length;

    return (
      dim('│ ') + ' '.repeat((offset)) + ansis.magenta.bold(target) + ': ' +
      ansis.gray('https://' + domain + '?preview_theme_id=' + id)
    );
  });

  return (
    dim('┌─ ') + color('Syncify ') + ansis.gray('<!version!>') + '\n' +
    dim('│ ') + '\n' +
    dim('│ ') + 'Running ' + color(config.resource) + ' mode in ' + color(config.env) + '\n' +
    dim('│ ') + 'Syncing to ' + stores + '  and ' + themes + '\n' +
    dim('│ ') + 'Spawned ' + spawns + '\n' + dim('│\n') +
    dim('│ ') + 'Previews:' + dim('\n│\n') + previews.join('\n') + '\n' +
    dim('│ ') + '\n'
  );

};

/**
 * Group - Printed first upon running resource
 *
 * `├─ title`
 */
export const group = (title: string) => dim('│\n├─ ') + ansis.bold(toUpcase(title)) + '\n' + dim('│') + '\n';

/**
 * Task - Prints the executed task/operation
 *
 * `│`
 */
export const task = (message: string) => dim('│ ') + message + '\n';

/**
 * Footer - Printed as the very bottom
 *
 * `└── message`
 */
export const footer = (message: string) => dim('│\n└── ') + message + '\n';