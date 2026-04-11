(function QueuedTracksTime() {
    const STYLE_ID = "queued-tracks-time-style";
    if (!document.getElementById(STYLE_ID)) {
        const style = document.createElement("style");
        style.id = STYLE_ID;
        style.innerHTML = `
            #queue-panel [data-flip-id="section-header-0"] {
                position: relative;
            }
            #queue-panel [data-flip-id="section-header-0"]::after {
                content: var(--queue-remaining, '');
                color: var(--spice-subtext, #b3b3b3);
                font-size: 0.875rem;
                position: absolute;
                top: 50%;
                right: 0;
                transform: translateY(-50%);
                font-weight: normal;
                pointer-events: none;
            }
        `;
        document.head.appendChild(style);
    }

    function updateDisplay() {
        if (!Spicetify?.Queue || !Spicetify?.Player) return;

        const queuedTracks = (Spicetify.Queue?.nextTracks || []).filter(
            t => t.provider === "queue"
        );

        const total = queuedTracks.reduce((acc, cur, _, arr) => {
            const dur = Number(cur.contextTrack?.metadata?.duration || cur.metadata?.duration);
            if (isNaN(dur)) { arr.splice(1); return acc; }
            return acc + dur;
        }, 0) || 0;

        const remaining = total + Spicetify.Player.getDuration() - Spicetify.Player.getProgress();
        const h = Math.floor(remaining / 3600000);
        const m = Math.floor((remaining % 3600000) / 60000);
        const s = Math.floor((remaining % 60000) / 1000);
        const formatted = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')} Left`;

        const header = document.querySelector('#queue-panel [data-flip-id="section-header-0"]');
        if (header) header.style.setProperty("--queue-remaining", `'${formatted}'`);
    }

    function waitForQueue() {
        if (!Spicetify?.Queue || !Spicetify?.Player) {
            setTimeout(waitForQueue, 500);
            return;
        }
        setInterval(updateDisplay, 1000);
    }

    waitForQueue();
})();
