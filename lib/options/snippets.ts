import { Config } from 'types';
import { has, isEmpty, isNil } from 'rambdax';
import { typeError, invalidError } from '~options/validate';
import { $ } from '~state';
import * as u from '~utils/native';

/**
 * Snippet Options
 *
 * Supports section sub-directories
 */
export function setSnippetOptions (config: Config) {

  if (!has('snippets', config.views)) return;

  const { snippets } = config.views;

  if (isNil(snippets)) return;
  if (u.isObject(snippets) && isEmpty(snippets)) return;

  // Ensure the section option is an object
  if (!u.isObject(snippets)) {
    typeError({
      option: 'views',
      name: 'snippets',
      expects: '{}',
      provided: typeof snippets
    });
  }
  // Iterate over all the properties in sections option
  for (const option in $.snippet) {

    // Validate the boolean type values of the option
    if (option === 'prefixDir') {
      if (u.isBoolean(snippets[option])) {
        $.snippet[option] = snippets[option];
        continue;
      } else {
        typeError({
          option: 'views.snippets',
          name: option,
          provided: snippets[option],
          expects: 'boolean'
        });
      }
    }

    // Validate the prefix separator option, in Shopifysnippets
    // We cannot use dot prefixes, we ensure only accepts values are defined.
    if (option === 'separator') {
      if (u.isString(snippets[option])) {

        // Only these character can be prefixers
        if (/[.@:_-]/.test(snippets[option])) {
          $.section[option] = snippets[option];
          continue;
        } else {
          invalidError('sections', option, snippets[option], '@ | _ | : | - | .');
        }
      } else {
        typeError({
          option: 'views.snippets',
          name: option,
          provided: snippets[option],
          expects: 'string'
        });
      }
    }

    // Validate the global globs which should have no prefixes applied.
    if (option === 'global') {

      const globals = u.isString(snippets[option]) ? [ snippets[option] ] : snippets[option];

      if (u.isArray(globals)) {

        if (globals.length > 0) {
          $.snippet[option] = new RegExp(`${globals.join('|')}`);
          continue;
        }
      } else {

        typeError({
          option: 'views.snippets',
          name: option,
          provided: snippets[option],
          expects: 'string | string[]'
        });
      }
    }
  }

};
