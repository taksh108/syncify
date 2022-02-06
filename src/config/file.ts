/* eslint-disable no-unused-vars */

import { join, parse } from 'path';
import { Syncify, IFile, IConfig, IViews, IStyle } from 'types';
import { assign, isRegex, isUndefined } from 'shared/native';
import { lastPath, parentPath } from 'shared/helpers';

/**
 * File types are represented as numeric values.
 * The infer the following:
 *
 */
export const enum Type {
  Template = 1,
  Layout,
  Snippet,
  Section,
  Config,
  Locale,
  Metafield,
  Style,
  CSS,
  SASS,
  Icon,
  Sprite,
  Asset,
  Redirect,
}

const setProps = (path: string, output: string) => {

  const file: Partial<IFile> = parse(path);

  return {
    file,
    merge: (namespace: string, type: Type): IFile => {
      return assign(file as IFile, {
        namespace,
        type,
        path,
        output,
        parent: lastPath(file.dir),
        key: join(namespace, file.base),
        config: null,
        size: NaN
      });
    }
  };

};

export const outputFile = (output: string) => (path: string) => {

  const { file, merge } = setProps(path, output);

  switch (lastPath(file.dir)) {
    case 'sections': return merge('sections', Type.Section);
    case 'snippets': return merge('sections', Type.Snippet);
    case 'layout': return merge('sections', Type.Layout);
    case 'templates': return merge('templates', Type.Template);
    case 'customers': return merge('templates', Type.Template);
    case 'config': return merge('config', Type.Config);
    case 'locales': return merge('locales', Type.Locale);
    case 'assets': return merge('assets', Type.Locale);
  }

};

/**
 * Parse File
 *
 * Parses the filename and returns a workable
 * object that we will pass into requests. Determines
 * whether or not we are working with metafield or asset
 * and vice-versa.
 */
export const parseFile = (paths: IConfig['paths'], output: string) => (path: string) => {

  const { file, merge } = setProps(path, output);

  if (/\.liquid/.test(file.ext)) {

    if (paths.sections(path)) {
      return merge('sections', Type.Section);
    }
    if (paths.snippets(path)) {
      return merge('snippets', Type.Snippet);
    }
    if (paths.layout(path)) {
      return merge('layout', Type.Layout);
    }
    if (paths.templates(path)) {
      return merge('templates', Type.Template);
    }
    if (paths.customers(path)) {
      return merge('templates/customers', Type.Template);
    }

  } else if (/\.json/.test(file.ext)) {

    if (paths.metafields(path)) {
      return merge(lastPath(file.dir), Type.Metafield);
    }
    if (paths.templates(path)) {
      return merge('templates', Type.Template);
    }
    if (paths.config(path)) {
      return merge('config', Type.Config);
    }
    if (paths.locales(path)) {
      return merge('locales', Type.Locale);
    }
    if (paths.customers(path)) {
      return merge('templates/customers', Type.Template);
    }

  } else if (/\.(?:css|scss|sass)/.test(file.ext)) {

    return merge('assets', Type.Style);

  } else if (paths.assets(path)) {

    return merge('assets', Type.Asset);

  }

};

/**
 * Augment the file configuration to accept
 * style types.
 */
export const isStyle = (file: IFile<IStyle>, transform: IStyle[]) => {

  const item = { ...file };

  item.config = transform.find(x => x.watch(file.path));
  item.type = item.ext === '.css' ? Type.CSS : Type.SASS;
  item.output = join(item.output, item.config.output);
  item.namespace = item.namespace === 'snippets' ? 'snippets' : item.namespace;
  item.key = item.config.output;

  return item;

};

/**
 * Augment the file configuration to accept
 * metafield types.
 */
export const isMetafield = (file: IFile) => {

  file.key = file.name;

  return file;

};

/**
 * Augment the file configuration to accept
 * metafield types.
 */
export const isSection = (file: IFile, transform: IViews['sections']) => {

  if (!transform.allowPrefix) {
    file.key = join(file.namespace, file.base);
  } else {
    if (isRegex(transform.globals)) {
      if (transform.globals.test(file.parent)) {
        file.key = join(file.namespace, file.base);
      } else {
        file.key = join(file.namespace, file.parent + transform.prefixSeparator + file.base);
      }
    } else {
      file.key = join(file.namespace, file.parent + transform.prefixSeparator + file.base);
    }
  }

  return file;

};

/**
 * Asset Modifier
 *
 * Handler function for a content modifier
 * callback that one can optionally execute
 * from within scripts.
 */
export const isAsset = (file: IFile, data: Buffer | string | object | any[], cb: typeof Syncify.hook) => {

  if (typeof cb !== 'function') return data.toString();

  const update = cb.call({ ...file }, data);

  if (isUndefined(update)) return data;

  if (/\.(liquid|html|json|js|css|scss|sass|txt|svg)/.test(file.ext)) {
    return update.toString();
  }

  return data.toString();

};
