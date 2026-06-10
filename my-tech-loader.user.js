// ==UserScript==
// @name         My Tech Script Loader
// @namespace    https://github.com/s4loed-blip/brscript51-55
// @version      0.2.2
// @description  Для работы отдела 41-45 / 51-55
// @author       tech51
// @match        https://forum.blackrussia.online/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// @run-at       document-start
// @license      MIT
// @updateURL    https://raw.githubusercontent.com/s4loed-blip/brscript51-55/main/my-tech-loader.user.js
// @downloadURL  https://raw.githubusercontent.com/s4loed-blip/brscript51-55/main/my-tech-loader.user.js
// ==/UserScript==

(() => {
    'use strict';

    const CONFIG = {
        sourceUrl: 'https://raw.githubusercontent.com/s4loed-blip/brscript51-55/main/forum-buttons.js',
        timeoutMs: 10000,
        retries: 3,
        retryDelayMs: 1200,
        cacheKey: 'my_tech_script_cache_v2',
        oldCacheKey: 'my_tech_script_cache',
        debug: false,
        build: 'loader-0.2.2-click-guard-v11-20260610-2310'
    };

    const pageWindow = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
    const log = (...args) => CONFIG.debug && console.log('[My Tech Loader]', ...args);

    let alreadyRan = false;

    function getCache() {
        try {
            return GM_getValue(CONFIG.cacheKey) || GM_getValue(CONFIG.oldCacheKey) || null;
        } catch (e) {
            return null;
        }
    }

    function setCache(code) {
        try {
            GM_setValue(CONFIG.cacheKey, {
                savedAt: Date.now(),
                build: CONFIG.build,
                code
            });
        } catch (e) {}
    }

    function wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function waitForDocumentElement() {
        return new Promise(resolve => {
            if (document.documentElement) return resolve();
            const timer = setInterval(() => {
                if (document.documentElement) {
                    clearInterval(timer);
                    resolve();
                }
            }, 10);
        });
    }

    function waitForPageJquery(maxMs = 8000) {
        return new Promise(resolve => {
            const started = Date.now();
            const timer = setInterval(() => {
                if (pageWindow.jQuery || Date.now() - started >= maxMs) {
                    clearInterval(timer);
                    resolve();
                }
            }, 50);
        });
    }

    function looksBad(code) {
        return !code || !String(code).trim() || String(code).includes('My Tech Script Loader');
    }

    function runInPage(code, reason) {
        if (alreadyRan || looksBad(code)) return false;
        alreadyRan = true;

        const script = document.createElement('script');
        script.textContent = `${code}\n//# sourceURL=brscript-forum-buttons-${reason}.js`;
        (document.head || document.documentElement).appendChild(script);
        script.remove();
        log('ran', reason);
        return true;
    }

    async function fetchSource(attempt = 1) {
        try {
            const separator = CONFIG.sourceUrl.includes('?') ? '&' : '?';
            const freshUrl = `${CONFIG.sourceUrl}${separator}v=${Date.now()}&loader=${encodeURIComponent(CONFIG.build)}`;

            const response = await Promise.race([
                fetch(freshUrl, { cache: 'no-store' }),
                new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), CONFIG.timeoutMs))
            ]);

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const code = await response.text();
            if (looksBad(code)) throw new Error('bad source');
            return code;
        } catch (error) {
            if (attempt < CONFIG.retries) {
                await wait(CONFIG.retryDelayMs);
                return fetchSource(attempt + 1);
            }
            throw error;
        }
    }

    async function main() {
        await waitForDocumentElement();

        const cached = getCache();
        const cachedCode = cached && cached.code ? cached.code : cached;

        if (cachedCode && !looksBad(cachedCode)) {
            waitForPageJquery(8000).then(() => runInPage(cachedCode, 'cache'));
        }

        try {
            const freshCode = await fetchSource();
            setCache(freshCode);

            if (!alreadyRan) {
                await waitForPageJquery(8000);
                runInPage(freshCode, 'fresh');
            }
        } catch (error) {
            console.error('[My Tech Loader] Не удалось загрузить свежий forum-buttons.js', error);
        }
    }

    main();
    pageWindow.rMyTechScript = () => pageWindow.location.reload();
})();
