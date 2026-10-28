// Values written by tools/build-app.mjs at build time.
declare const __HORS_LIGNE__: boolean;
declare const __APK__: boolean;
declare const __APK_VERSION__: number;
declare const __VERSION_APP__: string;

/** The site on GitHub Pages: it keeps an offline copy (service worker). */
export const HORS_LIGNE = __HORS_LIGNE__;
/** The Android app (APK): everything is inside, nothing to download. */
export const EST_APK = __APK__;
export const VERSION_APK = __APK_VERSION__;
export const VERSION_APP = __VERSION_APP__;

export const DEPOT = "https://github.com/hadesdray-crypto/footdex";
export const SITE = "https://hadesdray-crypto.github.io/footdex/";
export const LIEN_APK = `${DEPOT}/releases/latest/download/footdex.apk`;
