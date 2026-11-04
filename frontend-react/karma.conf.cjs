/**
 * Karma + Jasmine para probar los componentes React en un Chrome real (headless).
 *  - karma-webpack empaqueta tests/index.js (que reúne todos los *.spec) con babel-loader (JSX).
 *  - babel-plugin-istanbul instrumenta src/ y karma-coverage genera el informe en coverage/.
 * Ejecutar: npm test
 */
module.exports = function (config) {
    config.set({
        basePath: '',
        frameworks: ['jasmine', 'webpack'],
        files: [{ pattern: 'tests/index.js', watched: false }],
        preprocessors: { 'tests/index.js': ['webpack', 'sourcemap'] },

        webpack: {
            mode: 'development',
            devtool: 'inline-source-map',
            resolve: { extensions: ['.js', '.jsx'] },
            module: {
                rules: [{
                    test: /\.jsx?$/,
                    exclude: /node_modules/,
                    use: {
                        loader: 'babel-loader',
                        options: {
                            presets: [
                                ['@babel/preset-env', { targets: { chrome: '100' }, modules: false }],
                                ['@babel/preset-react', { runtime: 'automatic' }],
                            ],
                            plugins: [['istanbul', { exclude: ['tests/**', '**/*.spec.*'] }]],
                        },
                    },
                }],
            },
        },

        client: { jasmine: { random: false } }, // orden estable: más fácil de depurar y de explicar

        reporters: ['spec', 'coverage'],
        specReporter: { suppressPassed: false, suppressSkipped: true },
        coverageReporter: {
            dir: 'coverage',
            reporters: [
                { type: 'text' },
                { type: 'text-summary' },
                { type: 'html', subdir: 'html' },
                { type: 'json-summary', subdir: '.', file: 'resumen.json' },
            ],
            check: { global: { statements: 65, branches: 55, functions: 60, lines: 65 } },
        },

        browsers: ['ChromeHeadless'],
        singleRun: true,
        browserNoActivityTimeout: 60000,
    });
};
