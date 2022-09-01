import { File, Pages, Syncify } from 'types';
import { readFile, writeFile } from 'fs-extra';
import { join } from 'path';
import matter from 'gray-matter';
import { has, isEmpty } from 'rambdax';
import Turndown from 'turndown';
import gfm from 'turndown-plugin-gfm';
import Markdown from 'markdown-it';
import { bundle } from '../config';
import { log, error } from '~log';

export async function toMarkdown (content: string) {

  const td = new Turndown(bundle.page.import);

  td.use(gfm);

  return td.turndown(content);

}

export async function compile (file: File<Pages>, cb: Syncify) {

  const read = await readFile(file.input);

  if (isEmpty(read.toString())) {
    log.skipped(file.relative, 'empty file');
    return null;
  }

  const { data, content } = matter(read);

  if (!has('title', data)) {
    // throw log.write('Missing Title');
  }

  if (has('html', data)) {
    bundle.page.export.html = data.html;
  }

  if (has('linkify', data)) {
    bundle.page.export.linkify = data.linkify;
  }

  if (has('breaks', data)) {
    bundle.page.export.breaks = data.breaks;
  }

  const body_html = Markdown(bundle.page.export).render(content);

  await writeFile(join(bundle.dirs.cache, 'pages', file.base), body_html).catch(
    error.write('Error writing Page reference', {
      file: file.relative
    })
  ); ;

  return {
    title: data.title,
    body_html
  };

}
