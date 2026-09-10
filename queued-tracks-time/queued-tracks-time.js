// @ts-check
// Name: Queued Tracks Time
// Author: gaprj
// Description: Shows the duration of manually queued tracks.

(function QueuedTracksTime() {
    function formatTime(ms) {
        const h = Math.floor(ms / 3600000);
        const m = Math.floor((ms % 3600000) / 60000);
        const s = Math.floor((ms % 60000) / 1000);
        return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')} Left`;
    }

    function updateDisplay() {
        if (!Spicetify?.Player || !Spicetify?.Platform?.PlayerAPI) return;

        const queueAPI = Spicetify.Platform.PlayerAPI._queue;
        const internalQueue = queueAPI?.getInternalQueue();
        if (!internalQueue) return;

        const allTracks = internalQueue.nextTracks || [];
        const queuedTracks = allTracks.filter(t => t.provider === "queue");

        let totalDuration = 0;
        for (const track of queuedTracks) {
            const dur = Number(track.contextTrack?.metadata?.duration || track.metadata?.duration || track.track?.metadata?.duration);
            if (!isNaN(dur)) {
                totalDuration += dur;
            }
        }

        const remaining = totalDuration + (Spicetify.Player.getDuration() - Spicetify.Player.getProgress());
        const timeText = remaining > 0 ? " - " + formatTime(remaining) : "";

        document.querySelectorAll('.gaprj-queue-time').forEach(el => el.style.display = 'none');

        const headers = [];
        
        const mainQueue = document.querySelector('.queue-queuePage-header h1');
        if (mainQueue) headers.push(mainQueue);

        const sidebar = document.querySelector('[data-testid="right-sidebar"]');
        if (sidebar) {
            const firstH2 = sidebar.querySelector('h2');
            if (firstH2) headers.push(firstH2);
        }

        const panel = document.querySelector('#queue-panel');
        if (panel) {
            const firstH2 = panel.querySelector('h2');
            if (firstH2) headers.push(firstH2);
        }

        headers.forEach(header => {
            let timeElement = header.querySelector('.gaprj-queue-time');
            if (!timeElement) {
                timeElement = document.createElement("span");
                timeElement.className = "gaprj-queue-time";
                timeElement.style.color = "#b3b3b3";
                timeElement.style.fontSize = "0.9em";
                timeElement.style.fontWeight = "normal";
                header.appendChild(timeElement);
            }
            timeElement.style.display = 'inline';
            timeElement.innerText = timeText;
        });
    }

    setInterval(updateDisplay, 1000);
})();
