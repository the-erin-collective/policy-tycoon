// Simple Karma configuration for headless testing without Angular CLI dependencies
module.exports = function (config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine'],
    files: [
      'src/**/*.spec.ts',
      'src/**/*.d.ts'
    ],
    preprocessors: {
      'src/**/*.spec.ts': ['webpack'],
      'src/**/*.ts': ['webpack']
    },
    webpack: {
      mode: 'development',
      resolve: {
        extensions: ['.ts', '.js']
      },
      module: {
        rules: [
          {
            test: /\.ts$/,
            use: 'ts-loader',
            exclude: /node_modules/
          }
        ]
      },
      stats: {
        colors: true,
        modules: true,
        reasons: true,
        errorDetails: true
      },
      devtool: 'inline-source-map'
    },
    webpackMiddleware: {
      stats: 'errors-only'
    },
    reporters: ['progress', 'kjhtml'],
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: false,
    browsers: ['ChromeHeadlessCustom'],
    singleRun: true,
    restartOnFileChange: true,
    customLaunchers: {
      ChromeHeadlessCustom: {
        base: 'ChromeHeadless',
        flags: [
          '--no-sandbox',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-dev-shm-usage',
          '--memory-pressure-off',
          '--js-flags="--max-old-space-size=4096"'
        ]
      }
    }
  });
};