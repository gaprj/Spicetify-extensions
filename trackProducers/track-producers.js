// @ts-check
// Name: Track Producers
// Author: gaprj
// Description: Shows clickable track producer(s) in the Now Playing bar with native scrolling.

(function TrackProducers() {
    if (!Spicetify?.Player || !Spicetify?.CosmosAsync) {
        setTimeout(TrackProducers, 300);
        return;
    }

    const cache = new Map();
    let currentUri = null;
    let currentProducers = null;

    async function getProducers(uri) {
        if (!uri || !uri.startsWith('spotify:track:')) return null;
        if (cache.has(uri)) return cache.get(uri);

        const trackId = uri.split(':')[2];
        try {
            const url = `https://spclient.wg.spotify.com/track-credits-view/v0/experimental/${trackId}/credits`;
            const res = await Spicetify.CosmosAsync.get(url);

            if (!res || !res.roleCredits) {
                cache.set(uri, null);
                return null;
            }

            const producerRole = res.roleCredits.find(r => {
                const title = String(r.roleTitle || r.title || r.role || "").toLowerCase();
                return title.includes('produc') || title.includes('produtt') || title.includes('produz');
            });

            if (producerRole) {
                const peopleList = producerRole.credits || producerRole.actionCredits || producerRole.artists;
                if (peopleList && peopleList.length > 0) {
                    const producers = peopleList.map(c => ({ name: c.name, uri: c.uri }));
                    cache.set(uri, producers);
                    return producers;
                }
            }
        } catch (e) {}

        cache.set(uri, null);
        return null;
    }

    function injectToDOM() {
        const container = document.querySelector('.main-trackInfo-container');
        if (!container) return;

        let prodSpan = container.querySelector('.gaprj-track-producer');

        if (!currentProducers || currentProducers.length === 0) {
            if (prodSpan) prodSpan.remove();
            return;
        }

        let target = container.querySelector('[data-testid="context-item-info-subtitles"]');
        if (target) {
            const inner = target.querySelector('span');
            if (inner) target = inner;
        } else {
            target = container.querySelector('.main-trackInfo-artists') || container;
        }

        if (!prodSpan) {
            prodSpan = document.createElement('span');
            prodSpan.className = 'gaprj-track-producer';
            prodSpan.style.color = 'var(--spice-subtext, #b3b3b3)';
            prodSpan.style.fontSize = '0.8125rem';
            prodSpan.style.whiteSpace = 'nowrap';
            prodSpan.style.display = 'inline';
            target.appendChild(prodSpan);
        } else {
            if (prodSpan.parentNode !== target || prodSpan.nextSibling) {
                target.appendChild(prodSpan);
            }
        }

        prodSpan.innerHTML = ' • Prod. ';
        
        const MAX_VISIBLE = 2;
        const visibleProducers = currentProducers.slice(0, MAX_VISIBLE);
        const hiddenCount = currentProducers.length - MAX_VISIBLE;

        visibleProducers.forEach((p, index) => {
            if (p.uri) {
                const link = document.createElement('a');
                link.href = p.uri;
                link.innerText = p.name;
                link.style.color = 'inherit';
                link.style.textDecoration = 'none';
                link.onmouseover = () => link.style.textDecoration = 'underline';
                link.onmouseout = () => link.style.textDecoration = 'none';
                link.onclick = (e) => {
                    e.preventDefault();
                    const artistId = p.uri.split(':')[2];
                    if (artistId) {
                        Spicetify.Platform.History.push(`/artist/${artistId}`);
                    }
                };
                prodSpan.appendChild(link);
            } else {
                const text = document.createElement('span');
                text.innerText = p.name;
                prodSpan.appendChild(text);
            }

            if (index < visibleProducers.length - 1) {
                const comma = document.createElement('span');
                comma.innerText = ', ';
                prodSpan.appendChild(comma);
            }
        });

        if (hiddenCount > 0) {
            const space = document.createElement('span');
            space.innerText = ' ';
            prodSpan.appendChild(space);

            const plusBtn = document.createElement('a');
            plusBtn.innerText = `+${hiddenCount}`;
            plusBtn.style.color = 'inherit';
            plusBtn.style.fontWeight = 'bold';
            plusBtn.style.textDecoration = 'none';
            plusBtn.style.cursor = 'pointer';
            plusBtn.onmouseover = () => plusBtn.style.textDecoration = 'underline';
            plusBtn.onmouseout = () => plusBtn.style.textDecoration = 'none';
            
            plusBtn.onclick = (e) => {
                e.preventDefault();
                
                const modalContent = document.createElement('div');
                modalContent.style.display = 'flex';
                modalContent.style.flexDirection = 'column';
                modalContent.style.gap = '12px';
                modalContent.style.padding = '10px 0';
                
                currentProducers.forEach(p => {
                    if (p.uri) {
                        const link = document.createElement('a');
                        link.href = p.uri;
                        link.innerText = p.name;
                        link.style.color = 'var(--spice-text, #fff)';
                        link.style.fontSize = '16px';
                        link.style.textDecoration = 'none';
                        link.onmouseover = () => link.style.textDecoration = 'underline';
                        link.onmouseout = () => link.style.textDecoration = 'none';
                        link.onclick = (ev) => {
                            ev.preventDefault();
                            Spicetify.PopupModal.hide();
                            const artistId = p.uri.split(':')[2];
                            if (artistId) {
                                Spicetify.Platform.History.push(`/artist/${artistId}`);
                            }
                        };
                        modalContent.appendChild(link);
                    } else {
                        const text = document.createElement('span');
                        text.innerText = p.name;
                        text.style.color = 'var(--spice-text, #fff)';
                        text.style.fontSize = '16px';
                        modalContent.appendChild(text);
                    }
                });
                
                Spicetify.PopupModal.display({
                    title: 'Track Producers',
                    content: modalContent
                });
            };
            prodSpan.appendChild(plusBtn);
        }
    }

    async function handleSongChange() {
        const uri = Spicetify.Player.data?.item?.uri;
        if (uri === currentUri) return;

        currentUri = uri;
        
        const existingSpan = document.querySelector('.gaprj-track-producer');
        if (existingSpan) existingSpan.remove();

        currentProducers = await getProducers(uri);
        injectToDOM();
    }

    Spicetify.Player.addEventListener('songchange', handleSongChange);
    
    const observer = new MutationObserver(() => {
        const container = document.querySelector('.main-trackInfo-container');
        if (container && currentProducers) {
            const prodSpan = container.querySelector('.gaprj-track-producer');
            
            let target = container.querySelector('[data-testid="context-item-info-subtitles"]');
            if (target) {
                const inner = target.querySelector('span');
                if (inner) target = inner;
            } else {
                target = container.querySelector('.main-trackInfo-artists') || container;
            }
            
            if (!prodSpan || prodSpan.parentNode !== target || prodSpan.nextSibling) {
                injectToDOM();
            }
        }
    });

    const startObserver = setInterval(() => {
        const nowPlayingBar = document.querySelector('.main-nowPlayingWidget-nowPlaying');
        if (nowPlayingBar) {
            clearInterval(startObserver);
            observer.observe(nowPlayingBar, { childList: true, subtree: true });
            handleSongChange(); 
        }
    }, 500);
})();
