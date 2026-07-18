// @ts-check
// Name: shuffleQueue
// Author: gaprj
// Description: Shuffles context tracks by toggling Spotify's native shuffle state.

(function ShuffleQueuePlugin() {
    if (!Spicetify?.Player || !Spicetify?.Platform?.PlayerAPI) {
        setTimeout(ShuffleQueuePlugin, 300);
        return;
    }

    async function triggerNativeShuffle() {
        const button = document.getElementById("spice-shuffle-floating-btn");
        if (button) button.style.pointerEvents = "none";

        try {
            const isShuffleEnabled = Spicetify.Player.getShuffle();

            if (isShuffleEnabled) {
                await Spicetify.Player.setShuffle(false);
                await new Promise(resolve => setTimeout(resolve, 200));
            }

            await Spicetify.Player.setShuffle(true);

            Spicetify.showNotification("Queue shuffled! 🔀");
        } catch (err) {
            Spicetify.showNotification("Shuffle error: " + err.message);
        } finally {
            if (button) button.style.pointerEvents = "auto";
        }
    }

    function createButton() {
        let button = document.getElementById("spice-shuffle-floating-btn");
        if (button) return button;

        button = document.createElement("button");
        button.id = "spice-shuffle-floating-btn";
        button.setAttribute("title", "Shuffle Queue");
        button.style.cssText = [
            "position:fixed",
            "z-index:99999",
            "background:transparent",
            "border:none",
            "color:#b3b3b3",
            "cursor:pointer",
            "display:none",
            "align-items:center",
            "justify-content:center",
            "width:32px",
            "height:32px",
            "transition:0.2s"
        ].join(";");

        const shuffleIcon = Spicetify.SVGIcons?.shuffle || '<path d="M13.151.922a.75.75 0 1 0-1.06 1.06L13.109 3H11.16a3.75 3.75 0 0 0-2.873 1.34l-6.173 7.356A2.25 2.25 0 0 1 .39 12.75H0V14.25h.391a3.75 3.75 0 0 0 2.873-1.34l6.173-7.356a2.25 2.25 0 0 1 1.724-1.054h1.949l-1.018 1.018a.75.75 0 1 0 1.06 1.06L15.91 3.81a.75.75 0 0 0 0-1.06L13.15.922z"></path><path d="M8.288 9.297a.75.75 0 1 1 1.145-.965l1.033 1.23a.75.75 0 0 1 0 1.06l-1.949 1.949a.75.75 0 1 1-1.06-1.06l1.018-1.018H6.526a3.75 3.75 0 0 1-2.864-1.337l-1.033-1.23a.75.75 0 1 1 1.145-.965l1.033 1.23a2.25 2.25 0 0 0 1.719.802h1.949l-1.018-1.018z"></path>';
        button.innerHTML = `<svg role="img" height="16" width="16" viewBox="0 0 16 16" fill="currentColor">${shuffleIcon}</svg>`;
        button.onclick = (e) => {
            e.preventDefault();
            triggerNativeShuffle();
        };

        document.body.appendChild(button);
        return button;
    }

    function updateButton() {
        const button = createButton();

        const queuePanel = document.querySelector("#queue-panel");
        const closeBtn =
            document.querySelector('div[data-testid="PanelHeader_CloseButton"]') ||
            document.querySelector('button[aria-label="Close"]') ||
            document.querySelector('button[aria-label="Chiudi"]');

        if (closeBtn) {
            const r = closeBtn.getBoundingClientRect();
            if (r.width > 0 && r.height > 0) {
                button.style.top = `${r.top}px`;
                button.style.left = `${r.left - 40}px`;
                button.style.display = "flex";
                return;
            }
        }

        if (queuePanel) {
            const r = queuePanel.getBoundingClientRect();
            if (r.width > 0 && r.height > 0) {
                button.style.top = `${r.top + 8}px`;
                button.style.left = `${r.right - 80}px`;
                button.style.display = "flex";
                return;
            }
        }

        if (Spicetify.Platform?.History?.location?.pathname === "/queue") {
            button.style.top = "72px";
            button.style.right = "32px";
            button.style.left = "auto";
            button.style.display = "flex";
            return;
        }

        button.style.display = "none";
    }

    createButton();
    setInterval(updateButton, 250);
})();
