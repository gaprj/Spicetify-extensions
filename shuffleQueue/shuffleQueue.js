// @ts-check
// Name: shuffleQueue
// Author: gaprj
// Description: Shuffles context tracks using a native reorder call and displays remaining queue time.

(function ShuffleQueuePlugin() {
    if (!Spicetify?.Player || !Spicetify?.Platform?.PlayerAPI) {
        setTimeout(ShuffleQueuePlugin, 300);
        return;
    }

    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    async function trueShuffleContext() {
        const button = document.getElementById("spice-shuffle-floating-btn");
        if (button) button.style.pointerEvents = "none";

        try {
            const queueAPI = Spicetify.Platform.PlayerAPI._queue;
            const internalQueue = queueAPI?.getInternalQueue();

            if (!internalQueue) {
                return;
            }

            const allTracks = internalQueue.nextTracks || [];

            const contextTracks = allTracks.filter(t => 
                t.provider !== "queue" && 
                (t.contextTrack?.uri?.includes(":track:") || t.uri?.includes(":track:"))
            );

            if (contextTracks.length <= 1) {
                Spicetify.showNotification("Not enough tracks to shuffle!");
                return;
            }

            const anchorRaw = contextTracks[0];
            const anchor = {
                uri: anchorRaw.contextTrack?.uri || anchorRaw.uri,
                uid: anchorRaw.contextTrack?.uid || anchorRaw.uid
            };

            const toShuffleRaw = contextTracks.slice(1);

            const shuffledTracks = shuffleArray([...toShuffleRaw]).map(t => ({
                uri: t.contextTrack?.uri || t.uri,
                uid: t.contextTrack?.uid || t.uid
            }));

            // @ts-ignore
            await queueAPI.reorderQueue(shuffledTracks, { after: anchor });
            
            Spicetify.showNotification(`Shuffled ${shuffledTracks.length + 1} tracks! 🔀`);

        } catch (err) {
            Spicetify.showNotification("Shuffle error: " + err.message);
        } finally {
            if (button) button.style.pointerEvents = "auto";
        }
    }

    function initFloatingButton() {
        let button = document.getElementById("spice-shuffle-floating-btn");
        if (!button) {
            button = document.createElement("button");
            button.id = "spice-shuffle-floating-btn";
            button.setAttribute("title", "Shuffle Queue");
            button.style.cssText = "position:fixed; z-index:99999; background:transparent; border:none; color:#b3b3b3; cursor:pointer; display:none; align-items:center; justify-content:center; width:32px; height:32px; transition:0.2s;";
            const shuffleIcon = Spicetify.SVGIcons?.shuffle || '<path d="M13.151.922a.75.75 0 1 0-1.06 1.06L13.109 3H11.16a3.75 3.75 0 0 0-2.873 1.34l-6.173 7.356A2.25 2.25 0 0 1 .39 12.75H0V14.25h.391a3.75 3.75 0 0 0 2.873-1.34l6.173-7.356a2.25 2.25 0 0 1 1.724-1.054h1.949l-1.018 1.018a.75.75 0 1 0 1.06 1.06L15.91 3.81a.75.75 0 0 0 0-1.06L13.15.922z"></path><path d="M8.288 9.297a.75.75 0 1 1 1.145-.965l1.033 1.23a.75.75 0 0 1 0 1.06l-1.949 1.949a.75.75 0 1 1-1.06-1.06l1.018-1.018H6.526a3.75 3.75 0 0 1-2.864-1.337l-1.033-1.23a.75.75 0 1 1 1.145-.965l1.033 1.23a2.25 2.25 0 0 0 1.719.802h1.949l-1.018-1.018z"></path>';
            button.innerHTML = `<svg role="img" height="16" width="16" viewBox="0 0 16 16" fill="currentColor">${shuffleIcon}</svg>`;
            button.onclick = (e) => { e.preventDefault(); trueShuffleContext(); };
            document.body.appendChild(button);
        }
        function update() {
            const close = document.querySelector('div[data-testid="PanelHeader_CloseButton"]') || document.querySelector('button[aria-label="Close"]');
            if (close) {
                const r = close.getBoundingClientRect();
                if (r.width > 0) { button.style.top = `${r.top}px`; button.style.left = `${r.left - 40}px`; button.style.display = 'flex'; return; }
            }
            button.style.display = 'none';
        }
        setInterval(update, 100);
    }

    initFloatingButton();

    setInterval(() => {
        if (!window.moment) return;
        const tracks = Spicetify.Queue?.nextTracks || [];
        const total = tracks.reduce((acc, cur) => acc + (Number(cur.contextTrack?.metadata?.duration || cur.metadata?.duration) || 0), 0);
        const timeStr = window.moment.utc(total + Spicetify.Player.getDuration() - Spicetify.Player.getProgress()).format('HH:mm:ss');
        document.querySelectorAll('.queue-queuePage-header, .NWVZ_rxlezZ8xTHlMg4Y:first-child .LFdMliaHVgrpBcqNKHU3, .vLZJk3f3zoMmc3u9QMrc .LIaQPESoX4ijscRRn3lz:first-of-type, .KHNumev0cQFGYG2rSV1p:first-child .fYX4XCQz81A_L1WZ88uc').forEach(e => {
            // @ts-ignore
            e.style.setProperty('--queue-remaining', `'${timeStr} Left'`);
        });
    }, 1000);
})();
