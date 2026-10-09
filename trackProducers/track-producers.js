// @ts-check
// Name: Track Producers
// Author: gaprj
// Description: Shows clickable track producer(s) in the Now Playing bar with native scrolling.

(function TrackProducers() {
    const root = window;
    const TAG = "[Track Producers]";

    console.info(TAG, "Script loaded.");

    let attempts = 0;

    function boot() {
        const sp = root.Spicetify;

        if (!sp?.Player || !sp?.CosmosAsync) {
            attempts++;

            if (attempts === 1 || attempts % 10 === 0) {
                console.info(TAG, "Waiting for APIs.", {
                    attempt: attempts,
                    player: Boolean(sp?.Player),
                    cosmos: Boolean(sp?.CosmosAsync)
                });
            }

            if (attempts < 40) {
                setTimeout(boot, 300);
            } else {
                console.error(TAG, "Required APIs unavailable.");
            }

            return;
        }

        initialize(sp);
    }

    function initialize(sp) {
        root.__gaprjTrackProducersCleanup?.();

        const cache = new Map();
        const pending = new Map();
        const CACHE_TTL = 600000;
        const EMPTY_TTL = 30000;

        let currentUri = null;
        let currentProducers = null;
        let generation = 0;
        let initialized = false;
        let observer;
        let renderTimer = 0;
        let lastAnchorWarning = "";

        console.info(TAG, "APIs ready.");

        function findWidget() {
            return document.querySelector(
                '[data-testid="now-playing-widget"]'
            );
        }

        function findArtistNode(widget) {
            const item = sp.Player.data?.item;
            const title = String(item?.name || "")
                .trim()
                .toLowerCase();

            const artists = (Array.isArray(item?.artists)
                ? item.artists
                : []
            ).map(artist =>
                String(
                    typeof artist === "string"
                        ? artist
                        : artist?.name || ""
                ).trim().toLowerCase()
            ).filter(Boolean);

            const candidates = [
                ...widget.querySelectorAll('[data-encore-id="text"]')
            ];

            if (artists.length) {
                const match = candidates.find(node => {
                    const text = (node.textContent || "")
                        .trim()
                        .toLowerCase();

                    return artists.every(name => text.includes(name));
                });

                if (match) return match;
            }

            const nonTitle = candidates.find(node => {
                const text = (node.textContent || "")
                    .trim()
                    .toLowerCase();

                return text && text !== title;
            });

            return nonTitle || null;
        }

        function parseCredits(response) {
            const body = response?.body ?? response;

            const roles = Array.isArray(body?.roleCredits)
                ? body.roleCredits
                : Array.isArray(body?.data?.roleCredits)
                    ? body.data.roleCredits
                    : [];

            const producers = [];
            const seen = new Set();

            console.info(TAG, "Credits response.", {
                keys: Object.keys(body || {}),
                roles: roles.length
            });

            for (const role of roles) {
                const title = String(
                    role?.roleTitle ||
                    role?.title ||
                    role?.role ||
                    ""
                ).toLowerCase();

                if (!/produc|produtt|produz/.test(title)) {
                    continue;
                }

                const people = [
                    ...(Array.isArray(role?.credits)
                        ? role.credits
                        : []),
                    ...(Array.isArray(role?.actionCredits)
                        ? role.actionCredits
                        : []),
                    ...(Array.isArray(role?.artists)
                        ? role.artists
                        : [])
                ];

                for (const person of people) {
                    const artist = person?.artist || person;
                    const name = String(
                        artist?.name ||
                        artist?.displayName ||
                        person?.name ||
                        ""
                    ).trim();

                    if (!name) continue;

                    const uri = String(
                        artist?.uri || person?.uri || ""
                    );

                    const key = uri || name.toLowerCase();

                    if (seen.has(key)) continue;
                    seen.add(key);

                    producers.push({
                        name,
                        uri: uri.startsWith("spotify:artist:")
                            ? uri
                            : null
                    });
                }
            }

            console.info(TAG, "Credits parsed.", {
                producers: producers.length
            });

            return producers;
        }

        async function getProducers(uri) {
            if (!uri?.startsWith("spotify:track:")) {
                console.warn(TAG, "Not a catalog track.", { uri });
                return [];
            }

            const entry = cache.get(uri);

            if (entry && entry.expires > Date.now()) {
                console.info(TAG, "Cache hit.", {
                    producers: entry.value.length
                });

                return entry.value;
            }

            if (entry) cache.delete(uri);
            if (pending.has(uri)) return pending.get(uri);

            const trackId = uri.slice("spotify:track:".length);

            const request = (async () => {
                let producers = [];

                try {
                    const url =
                        "https://spclient.wg.spotify.com/" +
                        "track-credits-view/v0/experimental/" +
                        `${encodeURIComponent(trackId)}/credits`;

                    console.info(TAG, "Requesting credits.", {
                        trackId
                    });

                    let response;

                    for (let attempt = 1; attempt <= 2; attempt++) {
                        try {
                            response = await sp.CosmosAsync.get(url);
                            break;
                        } catch (error) {
                            console.warn(
                                TAG,
                                `Request failed, attempt ${attempt}.`,
                                error
                            );

                            if (attempt === 2) throw error;

                            await new Promise(resolve =>
                                setTimeout(resolve, 300)
                            );
                        }
                    }

                    producers = parseCredits(response);
                } catch (error) {
                    console.error(TAG, "Credits request failed.", error);
                } finally {
                    pending.delete(uri);
                }

                if (cache.size >= 200) {
                    const oldest = cache.keys().next().value;
                    if (oldest) cache.delete(oldest);
                }

                cache.set(uri, {
                    value: producers,
                    expires: Date.now() +
                        (producers.length ? CACHE_TTL : EMPTY_TTL)
                });

                return producers;
            })();

            pending.set(uri, request);
            return request;
        }

        function createProducerNode(producer, modal = false) {
            if (!producer.uri) {
                const span = document.createElement("span");
                span.textContent = producer.name;
                return span;
            }

            const link = document.createElement("a");
            link.href = producer.uri;
            link.textContent = producer.name;

            link.style.cssText =
                "color:inherit;text-decoration:none;cursor:pointer";

            link.addEventListener("mouseenter", () => {
                link.style.textDecoration = "underline";
            });

            link.addEventListener("mouseleave", () => {
                link.style.textDecoration = "none";
            });

            link.addEventListener("click", event => {
                event.preventDefault();
                event.stopPropagation();

                if (modal) sp.PopupModal?.hide?.();

                const id = producer.uri.slice(
                    "spotify:artist:".length
                );

                if (id) {
                    sp.Platform?.History?.push?.(`/artist/${id}`);
                }
            });

            return link;
        }

        function showAllProducers() {
            if (!sp.PopupModal?.display || !currentProducers?.length) {
                return;
            }

            const content = document.createElement("div");

            content.style.cssText =
                "display:flex;flex-direction:column;gap:12px;padding:10px 0";

            for (const producer of currentProducers) {
                const node = createProducerNode(producer, true);

                node.style.color = "var(--spice-text,#fff)";
                node.style.fontSize = "16px";

                content.appendChild(node);
            }

            sp.PopupModal.display({
                title: "Track Producers",
                content
            });
        }

        function render() {
            const widget = findWidget();

            if (!widget || !currentProducers?.length) {
                document.querySelectorAll(".gaprj-track-producer")
                    .forEach(node => node.remove());

                return;
            }

            const artistNode = findArtistNode(widget);

            if (!artistNode) {
                if (lastAnchorWarning !== currentUri) {
                    lastAnchorWarning = currentUri;

                    console.warn(TAG, "Artist node not found.", {
                        title: sp.Player.data?.item?.name,
                        artists: sp.Player.data?.item?.artists,
                        candidates: [
                            ...widget.querySelectorAll(
                                '[data-encore-id="text"]'
                            )
                        ].map(node => node.textContent)
                    });
                }

                return;
            }

            // Use the inline wrapper around the actual artist text.
            // Do not append the producers to an ancestor several levels up.
            const artistText = artistNode.querySelector(
                'span[dir="auto"]'
            );

            const target = artistText?.parentElement || artistNode;
            const signature = JSON.stringify(currentProducers);

            document.querySelectorAll(".gaprj-track-producer")
                .forEach(node => {
                    if (node.parentElement !== target) node.remove();
                });

            let badge = [...target.children].find(node =>
                node.classList.contains("gaprj-track-producer")
            );

            if (
                badge &&
                badge.dataset.signature === signature &&
                target.lastElementChild === badge
            ) {
                return;
            }

            if (!badge) {
                badge = document.createElement("span");
                badge.className = "gaprj-track-producer";
            }

            badge.style.cssText = [
                "display:inline",
                "margin-left:4px",
                "color:var(--spice-subtext,#b3b3b3)",
                "font-size:0.8125rem",
                "font-weight:normal",
                "white-space:normal",
                "vertical-align:baseline"
            ].join(";");

            badge.dataset.signature = signature;
            target.appendChild(badge);
            badge.replaceChildren();
            badge.append(" • Prod. ");

            const visible = currentProducers.slice(0, 2);

            visible.forEach((producer, index) => {
                badge.appendChild(createProducerNode(producer));

                if (index < visible.length - 1) {
                    badge.append(", ");
                }
            });

            const hidden = currentProducers.length - visible.length;

            if (hidden > 0) {
                const more = document.createElement("button");

                more.type = "button";
                more.textContent = `+${hidden}`;
                more.title = "Show all producers";

                more.style.cssText =
                    "border:0;padding:0;background:transparent;color:inherit;font:inherit;font-weight:bold;cursor:pointer";

                more.addEventListener("click", event => {
                    event.preventDefault();
                    event.stopPropagation();
                    showAllProducers();
                });

                badge.append(" ", more);
            }

            console.info(TAG, "Producers rendered.", {
                count: currentProducers.length,
                target: target.tagName,
                parent: target.parentElement?.tagName
            });
        }

        function scheduleRender() {
            if (renderTimer) return;

            renderTimer = window.setTimeout(() => {
                renderTimer = 0;
                render();
            }, 100);
        }

        async function handleSongChange() {
            const item = sp.Player.data?.item;
            const uri = item?.uri || null;

            if (initialized && uri === currentUri) {
                scheduleRender();
                return;
            }

            initialized = true;
            currentUri = uri;
            currentProducers = null;

            const requestGeneration = ++generation;

            document.querySelectorAll(".gaprj-track-producer")
                .forEach(node => node.remove());

            console.info(TAG, "Song changed.", {
                name: item?.name,
                uri
            });

            if (!uri?.startsWith("spotify:track:")) {
                currentProducers = [];
                return;
            }

            const producers = await getProducers(uri);

            if (
                requestGeneration !== generation ||
                currentUri !== uri
            ) {
                console.info(TAG, "Ignoring stale response.");
                return;
            }

            currentProducers = producers;

            if (!producers.length) {
                console.warn(TAG, "No producers to display.");
                return;
            }

            scheduleRender();
        }

        observer = new MutationObserver(scheduleRender);

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        const cleanup = () => {
            generation++;
            observer?.disconnect();

            if (renderTimer) clearTimeout(renderTimer);

            sp.Player.removeEventListener?.(
                "songchange",
                handleSongChange
            );

            document.querySelectorAll(".gaprj-track-producer")
                .forEach(node => node.remove());

            root.__gaprjTrackProducersCleanup = null;
            console.info(TAG, "Cleanup complete.");
        };

        root.__gaprjTrackProducersCleanup = cleanup;

        sp.Player.addEventListener("songchange", handleSongChange);
        void handleSongChange();
    }

    boot();
})();
