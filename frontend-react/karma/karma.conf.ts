/**
 * Karma + Jasmine para probar los componentes React en un Chrome real (headless). Configuración en TypeScript
 * (Karma la carga con ts-node. Está en la carpeta karma/ porque allí un package.json lo declara CommonJS, mientras que el paquete
 * principal es de tipo "module"; las opciones de compilación de este archivo están en la sección "ts-node" de tsconfig.json).
 *  - karma-webpack empaqueta tests/index.ts (que reúne todos los *.spec) con babel-loader (TypeScript + JSX).
 *  - babel-plugin-istanbul instrumenta src/ y karma-coverage genera el informe en coverage/.
 * Ejecutar: npm test
 */

/** Parte de la API de Karma que se usa aquí (así no hace falta instalar @types/karma). */
interface ConfiguracionKarma {
    set(opciones: Record<string, unknown>): void;
}

export = function (config: ConfiguracionKarma): void {
    config.set({
        basePath: '..', // la configuración vive en karma/; las rutas se resuelven desde la raíz del paquete
        frameworks: ['jasmine', 'webpack'],
        files: [{ pattern: 'tests/index.ts', watched: false }],
        preprocessors: { 'tests/index.ts': ['webpack', 'sourcemap'] },

        webpack: {
            mode: 'development',
            devtool: 'inline-source-map',
            // '.js' se mantiene solo para resolver las bibliotecas de terceros (React, Bootstrap...); el código del proyecto es .ts/.tsx.
            resolve: { extensions: ['.ts', '.tsx', '.js'] },
            module: {
                rules: [{
                    test: /\.tsx?$/,
                    exclude: /node_modules/,
                    use: {
                        loader: 'babel-loader',
                        options: {
                            presets: [
                                ['@babel/preset-env', { targets: { chrome: '100' }, modules: false }],
                                ['@babel/preset-react', { runtime: 'automatic' }],
                                '@babel/preset-typescript',
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
            check: { global: { statements: 78, branches: 68, functions: 74, lines: 80 } },
        },

        browsers: ['ChromeHeadless'],
        // Para contenedores o integración continua (Chrome como root): npm test -- --browsers ChromeHeadlessSinSandbox
        customLaunchers: { ChromeHeadlessSinSandbox: { base: 'ChromeHeadless', flags: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'] } },
        singleRun: true,
        browserNoActivityTimeout: 60000,
    });
};
