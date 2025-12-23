/**
 * Share Logic for CalculaHub
 * Compresses/Decompresses state to URL query string.
 * Depends on: lz-string (via CDN)
 */

const Share = {
    // Serialize and compress object
    encode: (data) => {
        try {
            const json = JSON.stringify(data);
            const compressed = LZString.compressToEncodedURIComponent(json);
            return compressed;
        } catch (e) {
            console.error('Compression error:', e);
            return null;
        }
    },

    // Decompress and parse
    decode: (str) => {
        try {
            if (!str) return null;
            const decompressed = LZString.decompressFromEncodedURIComponent(str);
            return JSON.parse(decompressed);
        } catch (e) {
            console.error('Decompression error:', e);
            return null;
        }
    },

    // Update URL without reload
    updateURL: (data) => {
        const compressed = Share.encode(data);
        if (compressed) {
            const newUrl = window.location.pathname + '?s=' + compressed;
            window.history.replaceState({ path: newUrl }, '', newUrl);
        }
    },

    // Clear URL query params
    clearURL: () => {
        const newUrl = window.location.pathname;
        window.history.replaceState({ path: newUrl }, '', newUrl);
    },

    // Check for shared state on load
    loadFromURL: () => {
        const params = new URLSearchParams(window.location.search);
        const s = params.get('s');
        if (s) {
            return Share.decode(s);
        }
        return null;
    },

    // Copy current URL to clipboard
    copyLink: () => {
        navigator.clipboard.writeText(window.location.href).then(() => {
            alert('Link copiado para a área de transferência!');
        });
    }
};
