/** @type {import('next').NextConfig} */
const nextConfig = {
    webpack: (config, { isServer }) => {
        // Resolve yjs to a single instance
        config.resolve.alias = {
            ...config.resolve.alias,
            yjs: require.resolve('yjs'),
        };

        // Enable WASM support
        config.experiments = {
            ...config.experiments,
            asyncWebAssembly: true,
            layers: true,
        };

        return config;
    },
};

module.exports = nextConfig;
