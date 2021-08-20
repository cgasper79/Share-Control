/**
 * Welcome to your Workbox-powered service worker!
 *
 * You'll need to register this file in your web app and you should
 * disable HTTP caching for this file too.
 * See https://goo.gl/nhQhGp
 *
 * The rest of the code is auto-generated. Please don't update this file
 * directly; instead, make changes to your Workbox build configuration
 * and re-run your build process.
 * See https://goo.gl/2aRDsh
 */
importScripts("https://storage.googleapis.com/workbox-cdn/releases/4.3.1/workbox-sw.js");
workbox.core.setCacheNameDetails({
  prefix: "blaze"
});
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
/**
 * The workboxSW.precacheAndRoute() method efficiently caches and responds to
 * requests for URLs in the manifest.
 * See https://goo.gl/S9QRab
 */

self.__precacheManifest = [{
  "url": "app.html",
  "revision": "aa6603950d4415804d998068521d3d31"
}, {
  "url": "fonts/icomoon.eot",
  "revision": "0c229641b987bfa52e13641477e922bd"
}, {
  "url": "fonts/icomoon.svg",
  "revision": "0474d672cdc2ffe5985f5f6308c3f79a"
}, {
  "url": "fonts/icomoon.ttf",
  "revision": "d937f5f427464643dbabeb8be57f75ee"
}, {
  "url": "fonts/icomoon.woff",
  "revision": "343c18e456adfb80e3aa3484798dea2e"
}].concat(self.__precacheManifest || []);
workbox.precaching.precacheAndRoute(self.__precacheManifest, {});
workbox.routing.registerRoute(/\.(?:js|css)$/, new workbox.strategies.StaleWhileRevalidate(), 'GET');
workbox.routing.registerRoute(/^https:\/\/fonts\.googleapis\.com/, new workbox.strategies.StaleWhileRevalidate({
  "cacheName": "blaze-google-fonts-stylesheets",
  plugins: []
}), 'GET');
workbox.routing.registerRoute(/^https:\/\/fonts\.gstatic\.com/, new workbox.strategies.CacheFirst({
  "cacheName": "blaze-google-fonts-webfonts",
  plugins: [new workbox.cacheableResponse.Plugin({
    statuses: [0, 200]
  }), new workbox.expiration.Plugin({
    maxAgeSeconds: 31536000,
    purgeOnQuotaError: false
  })]
}), 'GET');
workbox.routing.registerRoute(/(?:noise.png)$/, new workbox.strategies.CacheFirst({
  "cacheName": "blaze-images",
  plugins: [new workbox.expiration.Plugin({
    maxEntries: 60,
    maxAgeSeconds: 2592000,
    purgeOnQuotaError: false
  })]
}), 'GET');