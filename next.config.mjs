import withPWA from 'next-pwa';

/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,      // Enable React strict mode for improved error handling
    swcMinify: true,            // Enable SWC minification for improved performance
    compiler: {
        // removeConsole: process.env.NODE_ENV !== 'development'       // Remove console.log in production
    },
    allowedDevOrigins: [
        'localhost',
        '127.0.0.1',
        '192.168.1.140',
    ]
};

export default withPWA({
    dest: "public",         // destination directory for the PWA files
    disable: process.env.NODE_ENV === "development",        // disable PWA in the development environment
    register: true,         // register the PWA service worker
    skipWaiting: true,          // skip waiting for service worker activation

    // Prevent Workbox from precaching the non-existent path
    buildExcludes: [/app-build-manifest\.json$/],

    // Optional safety: clean older caches
    cleanupOutdatedCaches: true,

})(nextConfig);
