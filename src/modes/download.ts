import { Syncify, Requests } from 'types';
import { join } from 'path';
import { has } from 'rambdax';
import { writeFile } from 'fs-extra';
import * as request from 'requests/assets';
import { isFunction, assign, isUndefined, isString, isBuffer } from 'shared/native';
import * as timer from 'process/timer';
import { bundle } from '../options/index';

export const download = async (cb?: Syncify): Promise<void> => {

  timer.start();

  const hashook = isFunction(cb);

  for (const store of bundle.sync.stores) {

    const theme = bundle.sync.themes[store.domain];
    const { assets } = await request.get<Requests.Assets>(theme.url, store.client);

    for (const { key } of assets) {

      try {

        const data = assign({}, store.client, { params: { 'asset[key]': key } });
        const { asset } = await request.get<Requests.Asset>(theme.url, data);
        const output = join(bundle.dirs.import, store.domain, theme.target, key);
        const buffer = has('attachment', asset)
          ? Buffer.from(asset.attachment, 'base64')
          : Buffer.from(asset.value || null, 'utf8');

        if (hashook) {

          const update = cb.apply({ asset, output }, buffer);

          if (isUndefined(update) || update === false) {
            await writeFile(output, buffer);
          } else if (isString(update) || isBuffer(update)) {
            await writeFile(output, update);
          } else {
            await writeFile(output, buffer);
          }

        } else {

          await writeFile(output, buffer);

        }

      } catch (e) {

        console.log(e);

      }

    }

  }

  // log.finish('download');

};