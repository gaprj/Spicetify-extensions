// @ts-check

// NAME: Clone Playlist
// AUTHOR: your-username
// DESCRIPTION: Clone any Spotify playlist via right-click context menu

/// <reference path="../shared/types/spicetify.d.ts" />

(function clonePlaylist() {
    if (!(Spicetify.CosmosAsync && Spicetify.ContextMenu)) {
        setTimeout(clonePlaylist, 200);
        return;
    }

    new Spicetify.ContextMenu.Item(
        "Clone Playlist",
        fetchAndCreate,
        uriPlaylist,
        `<svg role="img" height="16" width="16" viewBox="0 0 512 512" fill="currentColor"><path d="M8 224h272a8 8 0 0 0 8-8v-16a8 8 0 0 0-8-8H8a8 8 0 0 0-8 8v16a8 8 0 0 0 8 8zm152 104a8 8 0 0 0-8-8H8a8 8 0 0 0-8 8v16a8 8 0 0 0 8 8h144a8 8 0 0 0 8-8zM8 96h272a8 8 0 0 0 8-8V72a8 8 0 0 0-8-8H8a8 8 0 0 0-8 8v16a8 8 0 0 0 8 8zM470 1.64l-96.59 31.88C360.72 37.74 352 50 352 64v312.13C331.66 361.28 303.38 352 272 352c-61.86 0-112 35.82-112 80s50.14 80 112 80 112-35.82 112-80V192l106.12-35.37A32 32 0 0 0 512 126.27V32a32 32 0 0 0-42-30.36zM272 480c-47.14 0-80-25.3-80-48s32.86-48 80-48 80 25.3 80 48-32.86 48-80 48zm208-353.72l-96 32V64h-.56v-.13L480 32z"></path></svg>`,
    ).register();

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function getToken() {
        // @ts-ignore
        return Spicetify.Platform.Session.accessToken;
    }

    async function getFreshToken() {
        try { await Spicetify.CosmosAsync.get("sp://user-profile-view/v3/profile/self"); } catch (_) {}
        // @ts-ignore
        return Spicetify.Platform.Session.accessToken;
    }

    function resolveImageUrl(value) {
        if (!value) return null;
        if (typeof value === "string") {
            if (value.startsWith("https://")) return value;
            if (value.startsWith("spotify:image:")) return "https://i.scdn.co/image/" + value.split(":")[2];
            if (/^[0-9a-f]{32,}$/i.test(value)) return "https://i.scdn.co/image/" + value;
        }
        return null;
    }

    async function sleepWithNotification(seconds, label) {
        for (let remaining = seconds; remaining > 0; remaining -= 5) {
            Spicetify.showNotification(`${label} (${remaining}s...)`);
            await sleep(Math.min(5000, remaining * 1000));
        }
    }

    function savePendingImageUpload(playlistId, playlistName, imageUrl) {
        try {
            const pending = JSON.parse(localStorage.getItem("clonePlaylist_pendingImages") || "[]");
            pending.push({ playlistId, playlistName, imageUrl, timestamp: Date.now() });
            localStorage.setItem("clonePlaylist_pendingImages", JSON.stringify(pending));
            console.log("[ClonePlaylist] Pending cover saved. Run retryPendingImages() in console later.");
        } catch (_) {}
    }

    // @ts-ignore
    window.retryPendingImages = async function () {
        const pending = JSON.parse(localStorage.getItem("clonePlaylist_pendingImages") || "[]");
        if (!pending.length) { console.log("[ClonePlaylist] No pending uploads."); return; }
        console.log(`[ClonePlaylist] ${pending.length} pending upload(s) found...`);
        const remaining = [];
        for (const item of pending) {
            console.log(`[ClonePlaylist] Retrying cover for "${item.playlistName}" (${item.playlistId})...`);
            try {
                const base64Data = await fetchImageBlobAsBase64(item.imageUrl);
                await uploadImageXHR(base64Data, item.playlistId, await getFreshToken());
                console.log(`[ClonePlaylist] ✅ Cover applied to "${item.playlistName}"`);
                Spicetify.showNotification(`✅ Cover applied to "${item.playlistName}"!`);
            } catch (e) {
                console.warn(`[ClonePlaylist] Still failing for "${item.playlistName}":`, e);
                remaining.push(item);
            }
            await sleep(3000);
        }
        localStorage.setItem("clonePlaylist_pendingImages", JSON.stringify(remaining));
        if (!remaining.length) console.log("[ClonePlaylist] All uploads completed! ✅");
        else console.log(`[ClonePlaylist] ${remaining.length} still pending. Try again later.`);
    };

    async function spotifyFetch(url, maxRetries = 5) {
        for (let i = 0; i < maxRetries; i++) {
            const res = await fetch(url, { headers: { Authorization: "Bearer " + getToken() } });
            if (res.ok) return res.json();
            if (res.status === 429) {
                const wait = parseInt(res.headers.get("Retry-After") || "5", 10);
                await sleep((wait + 1) * 1000);
            } else {
                throw new Error(`HTTP ${res.status}: ${url}`);
            }
        }
        throw new Error(`Max retries exceeded: ${url}`);
    }

    async function spotifyPost(url, body, maxRetries = 5) {
        for (let i = 0; i < maxRetries; i++) {
            const res = await fetch(url, {
                method: "POST",
                headers: { Authorization: "Bearer " + getToken(), "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            if (res.ok) return res.json();
            if (res.status === 429) {
                const wait = parseInt(res.headers.get("Retry-After") || "5", 10);
                await sleep((wait + 1) * 1000);
            } else {
                throw new Error(`HTTP ${res.status} POST ${url}`);
            }
        }
        throw new Error(`Max retries exceeded POST: ${url}`);
    }

    async function spotifyPut(url, body) {
        for (let i = 0; i < 5; i++) {
            const res = await fetch(url, {
                method: "PUT",
                headers: { Authorization: "Bearer " + getToken(), "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            if (res.ok || res.status === 200) return;
            if (res.status === 429) {
                const wait = parseInt(res.headers.get("Retry-After") || "5", 10);
                await sleep((wait + 1) * 1000);
            } else {
                throw new Error(`HTTP ${res.status} PUT ${url}`);
            }
        }
    }

    function fetchImageBlobAsBase64(url) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open("GET", url, true);
            xhr.responseType = "blob";
            xhr.onload = function () {
                if (xhr.status === 200) {
                    const reader = new FileReader();
                    // @ts-ignore
                    reader.onloadend = () => resolve(reader.result.split("base64,")[1]);
                    reader.onerror = () => reject(new Error("FileReader error"));
                    reader.readAsDataURL(xhr.response);
                } else {
                    reject(new Error("Image fetch failed: HTTP " + xhr.status));
                }
            };
            xhr.onerror = () => reject(new Error("XHR network error (fetch image)"));
            xhr.send();
        });
    }

    function uploadImageXHR(base64Data, playlistId, token) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open("PUT", `https://api.spotify.com/v1/playlists/${playlistId}/images`, true);
            xhr.setRequestHeader("Authorization", "Bearer " + token);
            xhr.setRequestHeader("Content-Type", "image/jpeg");
            xhr.onload = function () {
                if (xhr.status === 200 || xhr.status === 202) {
                    resolve(null);
                } else if (xhr.status === 429) {
                    reject({ status: 429, retryAfter: parseInt(xhr.getResponseHeader("Retry-After") || "60", 10) });
                } else if (xhr.status === 401) {
                    reject({ status: 401 });
                } else {
                    reject(new Error("HTTP " + xhr.status + " — " + xhr.responseText));
                }
            };
            xhr.onerror = () => reject(new Error("XHR network error (upload image)"));
            xhr.send(base64Data);
        });
    }

    async function updatePlaylistImage(base64Data, playlistId, playlistName, imageUrl) {
        for (let i = 0; i < 3; i++) {
            try {
                const token = i === 0 ? getToken() : await getFreshToken();
                console.log(`[ClonePlaylist] Cover upload attempt ${i + 1}/3...`);
                await uploadImageXHR(base64Data, playlistId, token);
                console.log("[ClonePlaylist] ✅ Cover updated");
                Spicetify.showNotification(`"${playlistName}" cloned! ✅`);
                return true;
            } catch (err) {
                // @ts-ignore
                if (err && err.status === 401) {
                    console.warn(`[ClonePlaylist] 401 token expired — refreshing (attempt ${i + 1}/3)`);
                    await sleep(1000);
                // @ts-ignore
                } else if (err && err.status === 429) {
                    // @ts-ignore
                    const wait = err.retryAfter || 60;
                    if (wait > 120) {
                        console.warn(`[ClonePlaylist] ⚠️ Image quota exhausted (Retry-After: ${wait}s). Saving for later.`);
                        savePendingImageUpload(playlistId, playlistName, imageUrl);
                        Spicetify.showNotification(
                            `"${playlistName}" cloned ✅ — Cover blocked (Spotify quota). Run retryPendingImages() in console later.`,
                            true
                        );
                        return false;
                    }
                    console.warn(`[ClonePlaylist] 429 — waiting ${wait}s (attempt ${i + 1}/3)`);
                    await sleepWithNotification(wait + 5, `⏳ Cover rate limited`);
                } else {
                    throw err;
                }
            }
        }
        savePendingImageUpload(playlistId, playlistName, imageUrl);
        Spicetify.showNotification(`"${playlistName}" cloned ✅ — Cover failed. Run retryPendingImages() in console later.`, true);
        return false;
    }

    function uriPlaylist(uris) {
        if (uris.length > 1) return false;
        const uriObj = Spicetify.URI.fromString(uris[0]);
        return (
            uriObj.type === Spicetify.URI.Type.PLAYLIST ||
            uriObj.type === Spicetify.URI.Type.PLAYLIST_V2
        );
    }

    function fetchAndCreate(uris) {
        fetchPlaylist(uris[0])
            .then((meta) => {
                createPlaylist(meta).catch((err) => {
                    Spicetify.showNotification("Clone failed! Check console.", true);
                    console.error("[ClonePlaylist] Creation error:", err);
                });
            })
            .catch((err) => {
                Spicetify.showNotification("Fetch failed! Check console.", true);
                console.error("[ClonePlaylist] Fetch error:", err);
            });
    }

    async function fetchPlaylist(uri) {
        Spicetify.showNotification("Fetching playlist...");
        const playlistId = uri.split(":")[2];
        let trackUris = [];
        let playlistMeta = null;

        // @ts-ignore
        const PlaylistAPI = Spicetify.Platform?.PlaylistAPI;

        if (PlaylistAPI?.getContents) {
            try {
                let offset = 0;
                const limit = 100;
                while (true) {
                    // @ts-ignore
                    const page = await PlaylistAPI.getContents(uri, { offset, limit });
                    const items = page?.items ?? [];
                    trackUris = trackUris.concat(
                        items.filter(i => i?.type === "track" && i?.uri).map(i => i.uri)
                    );
                    if (items.length < limit) break;
                    offset += limit;
                }
                console.log(`[ClonePlaylist] ${trackUris.length} tracks found`);
            } catch (e) {
                console.warn("[ClonePlaylist] getContents failed, falling back to Web API", e);
                trackUris = [];
            }
        }

        if (PlaylistAPI?.getMetadata) {
            try {
                // @ts-ignore
                const pm = await PlaylistAPI.getMetadata(uri);
                const rawImage =
                    pm?.images?.[0]?.url ??
                    pm?.images?.[0] ??
                    pm?.picture ??
                    pm?.artwork?.url ??
                    pm?.cover?.url ??
                    null;
                const imageUrl = resolveImageUrl(rawImage);
                playlistMeta = {
                    name: pm?.name ?? "Playlist",
                    description: pm?.description ?? "",
                    owner: { name: pm?.owner?.name ?? pm?.ownerName ?? "Unknown" },
                    picture: imageUrl,
                };
                console.log(`[ClonePlaylist] Metadata OK: ${playlistMeta.name} | cover: ${imageUrl}`);
            } catch (e) {
                console.warn("[ClonePlaylist] getMetadata failed, falling back to Web API", e);
                playlistMeta = null;
            }
        }

        if (!playlistMeta) {
            const data = await spotifyFetch(
                `https://api.spotify.com/v1/playlists/${playlistId}?fields=name,description,images,owner`
            );
            playlistMeta = {
                name: data.name,
                description: data.description || "",
                owner: { name: data.owner.display_name || data.owner.id },
                picture: resolveImageUrl(data.images?.[0]?.url),
            };
        }

        if (trackUris.length === 0) {
            let nextUrl = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=100&fields=next,items(track(uri,type))`;
            while (nextUrl) {
                const data = await spotifyFetch(nextUrl);
                if (!data?.items) break;
                trackUris = trackUris.concat(
                    data.items.filter(i => i?.track?.uri && i.track.type === "track").map(i => i.track.uri)
                );
                nextUrl = data.next || null;
            }
        }

        return { uris: trackUris, data: playlistMeta };
    }

    async function createPlaylist(meta) {
        Spicetify.showNotification("Creating playlist...");

        const playlistName = `${meta.data.name} Clone`;
        const newDescription = `Clone of "${meta.data.name}" by ${meta.data.owner.name}. ${meta.data.description}`.trim();

        let newPlaylistId = null;
        let newPlaylistUri = null;

        // @ts-ignore
        const RootlistAPI = Spicetify.Platform?.RootlistAPI;
        // @ts-ignore
        const PlaylistAPI = Spicetify.Platform?.PlaylistAPI;

        if (RootlistAPI?.createPlaylist) {
            try {
                // @ts-ignore
                const result = await RootlistAPI.createPlaylist(playlistName, { isOwnedBySelf: true });
                newPlaylistUri = typeof result === "string" ? result : result?.uri;
                if (newPlaylistUri) {
                    newPlaylistId = newPlaylistUri.split(":")[2];
                    console.log("[ClonePlaylist] Playlist created:", newPlaylistUri);
                }
            } catch (e) {
                console.warn("[ClonePlaylist] RootlistAPI.createPlaylist failed", e);
                newPlaylistUri = null;
                newPlaylistId = null;
            }
        }

        if (!newPlaylistId) {
            const userProfile = await spotifyFetch("https://api.spotify.com/v1/me");
            const newPlaylist = await spotifyPost(
                `https://api.spotify.com/v1/users/${userProfile.id}/playlists`,
                { name: playlistName, public: false }
            );
            newPlaylistId = newPlaylist.id;
            newPlaylistUri = newPlaylist.uri;
        }

        let tracksAdded = false;
        if (PlaylistAPI?.add && newPlaylistUri) {
            try {
                // @ts-ignore
                await PlaylistAPI.add(newPlaylistUri, meta.uris, { after: { type: "end" } });
                tracksAdded = true;
                console.log(`[ClonePlaylist] ${meta.uris.length} tracks added`);
            } catch (e) {
                console.warn("[ClonePlaylist] PlaylistAPI.add failed, falling back to Web API", e);
            }
        }

        if (!tracksAdded) {
            for (let i = 0; i < meta.uris.length; i += 100) {
                await spotifyPost(
                    `https://api.spotify.com/v1/playlists/${newPlaylistId}/tracks`,
                    { uris: meta.uris.slice(i, i + 100) }
                );
                if (i + 100 < meta.uris.length) await sleep(500);
            }
        }

        Spicetify.showNotification(`"${playlistName}" created!`);

        let descriptionUpdated = false;
        if (PlaylistAPI?.setAttributes && newPlaylistUri) {
            try {
                // @ts-ignore
                await PlaylistAPI.setAttributes(newPlaylistUri, { name: playlistName, description: newDescription });
                descriptionUpdated = true;
                console.log("[ClonePlaylist] Description updated via setAttributes");
            } catch (e) {
                console.warn("[ClonePlaylist] setAttributes failed", e);
            }
        }
        if (!descriptionUpdated && PlaylistAPI?.setDescription && newPlaylistUri) {
            try {
                // @ts-ignore
                await PlaylistAPI.setDescription(newPlaylistUri, newDescription);
                descriptionUpdated = true;
                console.log("[ClonePlaylist] Description updated via setDescription");
            } catch (e) {
                console.warn("[ClonePlaylist] setDescription failed", e);
            }
        }
        if (!descriptionUpdated) {
            setTimeout(async () => {
                try {
                    await spotifyPut(`https://api.spotify.com/v1/playlists/${newPlaylistId}`, { description: newDescription });
                    console.log("[ClonePlaylist] Description updated via Web API");
                } catch (e) {
                    console.error("[ClonePlaylist] Description update failed:", e);
                }
            }, 15000);
        }

        if (meta.data.picture) {
            (async () => {
                try {
                    const base64Data = await fetchImageBlobAsBase64(meta.data.picture);
                    console.log(`[ClonePlaylist] Cover loaded: ${Math.round(base64Data.length / 1024)}KB`);
                    await updatePlaylistImage(base64Data, newPlaylistId, playlistName, meta.data.picture);
                } catch (e) {
                    console.error("[ClonePlaylist] Cover update failed:", e);
                    savePendingImageUpload(newPlaylistId, playlistName, meta.data.picture);
                    Spicetify.showNotification("Cover not applied — run retryPendingImages() in console later.", true);
                }
            })();
        } else {
            Spicetify.showNotification(`"${playlistName}" cloned! ✅`);
        }
    }
})();
