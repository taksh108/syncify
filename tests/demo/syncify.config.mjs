
export default {
  input: 'src',
  output: 'theme',
  export: 'export',
  import: 'import',
  config: 'config',
  stores: [
    {
      domain: 'syncify',
      themes: {
        dev: 129457717489,
        prod: 129457717489,
        stage: 129457717489,
        test: 129457717489
      }
    },
    {
      domain: 'boefje',
      themes: {
        dev: 43989205050,
        prod: 43989205050
      }
    }
  ],
  paths: {
    assets: 'assets/**/*',
    config: 'config/*.json',
    locales: 'locales/*.json',
    layout: [
      'views/theme.liquid',
      'views/layouts/*.liquid'
    ],
    sections: [
      'views/sections/**/*.liquid'
    ],
    metafields: 'metafields/**/*.json',
    customers: [
      'views/customers/*.json',
      'views/customers/*.liquid'
    ],
    pages: [
      'pages/*.md',
      'pages/*.html'
    ],
    templates: [
      'views/templates/*.json',
      'views/templates/*.liquid'
    ],
    snippets: [
      'views/snippets/*.liquid',
      'styles/snippet.css.liquid' // LETS TEST AN EXTERNAL LINKED FILE
    ]
  },
  spawn: {
    build: {
      tsup: 'tsup --minify-whitespace'
    },
    watch: {
      esbuild: [
        'esbuild',
        './src/scripts/index.ts',
        '--outfile=theme/assets/esbuild-bundle.js',
        '--bundle',
        '--watch',
        '--color=true'
      ]
    }
  },
  transforms: {
    json: {
      indent: 2,
      useTabs: false,
      exclude: []
    },
    sections: {
      directoryPrefixing: true,
      onlyPrefixDuplicates: false,
      prefixSeparator: '-',
      global: [
        'global'
      ]
    },
    pages: {
      importAs: 'markdown',
      liquidWarnings: true,
      fallbackAuthor: '',
      markdown: {
        breaks: true,
        headerIds: true,
        headerPrefix: '',
        mangle: true,
        silent: true,
        smartypants: false
      }
    },
    icons: {
      replacer: true,
      replacerTag: 'i',
      vscodeCustomData: false,
      inlined: [
        {
          input: [ 'icons/inlined/*.svg' ],
          rename: 'icon.[file]',
          snippet: true,
          svgo: true
        }
      ],
      sprites: [
        {
          input: 'icons/sprites/feather/*.svg',
          rename: 'icons.liquid',
          svgo: true,
          snippet: true,
          options: {
            dimensionAttributes: true,
            namespaceClassnames: true,
            namespaceIDS: false,
            rootAttributes: {
              id: 'foo'
            }
          }
        },
        {
          input: 'icons/sprites/social/*.svg',
          rename: 'social-icons.liquid',
          svgo: true,
          snippet: true,
          options: {
            dimensionAttributes: true,
            namespaceClassnames: true,
            namespaceIDS: false,
            rootAttributes: {
              id: 'foo'
            }
          }
        }
      ]
    },
    scripts: [

    ],
    styles: [
      {
        input: 'styles/stylesheet.scss',
        snippet: true,
        rename: 'style.min.css', // TEST dir RENAME
        postcss: true,
        watch: [
          'styles/**/*.scss' // COMPILE ON ANY CHANGES
        ],
        sass: {
          warnings: false, // NO WARNINGS
          sourcemap: true,
          style: 'compressed',
          include: [
            'node_modules'
          ]
        }
      }
    ]
  },
  terser: {
    json: 'prod',
    html: 'prod',
    pages: 'prod',
    rules: {
      minifyJS: false, // MUST BE FALSE - A WARNING WILL SHOW
      minifyCSS: false, // MUST BE FALSE - A WARNING WILL SHOW
      sortAttributes: false, // MUST BE FALSE - A WARNING WILL SHOW
      sortClassName: false, // MUST BE FALSE - A WARNING WILL SHOW
      caseSensitive: false,
      collapseBooleanAttributes: false,
      collapseInlineTagWhitespace: false,
      conservativeCollapse: false,
      keepClosingSlash: false,
      noNewlinesBeforeTagClose: false,
      preventAttributesEscaping: false,
      removeEmptyAttributes: false,
      removeEmptyElements: false,
      removeOptionalTags: false,
      removeRedundantAttributes: true,
      removeScriptTypeAttributes: true,
      removeStyleLinkTypeAttributes: true,
      useShortDoctype: true,
      collapseWhitespace: true,
      continueOnParseError: true,
      removeComments: true,
      trimCustomFragments: true,
      minifyLiquidSectionSchema: true,
      removeLiquidComments: true,
      stripInnerTagWhitespace: false,
      stripAttributesContainingNewlines: true,
      stripRedundantWhitespaceDashes: true,
      ignoreLiquidTags: [],
      ignoreLiquidObjects: [],
      ignoreCustomFragments: []
    }
  }
};