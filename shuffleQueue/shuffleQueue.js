// @ts-check
// Name: Shuffle Queue
// Author: gaprj
// Description: Shuffles context tracks using Spotify's native shuffle state.

(function ShuffleQueuePlugin() {
    const root = window;
    const sp = root.Spicetify;
    const TAG = "[Shuffle Queue]";
    const BUTTON_ID = "spice-shuffle-floating-btn";

    if (
        !sp?.Player ||
        typeof sp.Player.getShuffle !== "function" ||
        typeof sp.Player.setShuffle !== "function"
    ) {
        setTimeout(ShuffleQueuePlugin, 300);
        return;
    }

    root.__gaprjShuffleQueueCleanup?.();

    let button = null;
    let observer = null;
    let updateTimer = 0;
    let positionInterval = 0;
    let running = false;

    const sleep = ms =>
        new Promise(resolve => setTimeout(resolve, ms));

    function isVisible(element) {
        if (!element?.isConnected) return false;

        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);

        return rect.width > 0 &&
            rect.height > 0 &&
            style.display !== "none" &&
            style.visibility !== "hidden";
    }

    function findQueuePanel() {
        const panels = [
            ...document.querySelectorAll("#queue-panel")
        ];

        return panels.find(isVisible) || null;
    }

    function findCloseButton(panel) {
        const selectors = [
            '[data-testid="PanelHeader_CloseButton"]',
            'button[aria-label="Close" i]',
            'button[aria-label="Chiudi" i]',
            'button[aria-label*="close panel" i]',
            'button[aria-label*="chiudi pannello" i]'
        ];

        for (const selector of selectors) {
            const closeButton = panel?.querySelector(selector);

            if (closeButton && isVisible(closeButton)) {
                return closeButton;
            }
        }

        const rect = panel?.getBoundingClientRect();

        if (!rect) return null;

        const candidates = [
            ...document.querySelectorAll(
                'button[aria-label], [role="button"][aria-label], [data-testid="PanelHeader_CloseButton"]'
            )
        ].filter(element => {
            if (!isVisible(element)) return false;

            const label = [
                element.getAttribute("aria-label"),
                element.getAttribute("title"),
                element.getAttribute("data-testid")
            ].join(" ");

            if (!/close|chiudi/i.test(label)) return false;

            const box = element.getBoundingClientRect();

            return box.top < rect.top + 100 &&
                box.right >= rect.left &&
                box.left <= rect.right;
        });

        return candidates[0] || null;
    }

    function createButton() {
        const existing = document.getElementById(BUTTON_ID);

        if (existing) {
            return /** @type {HTMLButtonElement} */ (existing);
        }

        const element = document.createElement("button");

        element.id = BUTTON_ID;
        element.type = "button";
        element.title = "Shuffle Queue";
        element.setAttribute("aria-label", "Shuffle Queue");

        element.style.cssText = [
            "position:fixed",
            "z-index:99999",
            "appearance:none",
            "background:transparent",
            "border:none",
            "box-shadow:none",
            "padding:0",
            "margin:0",
            "color:#b3b3b3",
            "cursor:pointer",
            "display:none",
            "align-items:center",
            "justify-content:center",
            "width:32px",
            "height:32px",
            "transition:color 0.2s"
        ].join(";");

        const icon = sp.SVGIcons?.shuffle ||
            '<path d="M13.151.922a.75.75 0 1 0-1.06 1.06L13.109 3H11.16a3.75 3.75 0 0 0-2.873 1.34l-6.173 7.356A2.25 2.25 0 0 1 .39 12.75H0V14.25h.391a3.75 3.75 0 0 0 2.873-1.34l6.173-7.356a2.25 2.25 0 0 1 1.724-1.054h1.949l-1.018 1.018a.75.75 0 1 0 1.06 1.06L15.91 3.81a.75.75 0 0 0 0-1.06L13.15.922z"></path><path d="M8.288 9.297a.75.75 0 1 1 1.145-.965l1.033 1.23a.75.75 0 0 1 0 1.06l-1.949 1.949a.75.75 0 1 1-1.06-1.06l1.018-1.018H6.526a3.75 3.75 0 0 1-2.864-1.337l-1.033-1.23a.75.75 0 1 1 1.145-.965l1.033 1.23a2.25 2.25 0 0 0 1.719.802h1.949l-1.018-1.018z"></path>';

        element.innerHTML =
            `<svg role="img" height="16" width="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">${icon}</svg>`;

        element.addEventListener("mouseenter", () => {
            element.style.color = "var(--spice-text, #fff)";
        });

        element.addEventListener("mouseleave", () => {
            element.style.color = "#b3b3b3";
        });

        element.addEventListener("click", event => {
            event.preventDefault();
            event.stopPropagation();
            void shuffleQueue();
        });

        document.body.appendChild(element);

        console.info(TAG, "Button created.");

        return element;
    }

    async function waitForShuffle(expected, timeout = 1500) {
        const deadline = Date.now() + timeout;

        while (Date.now() < deadline) {
            if (sp.Player.getShuffle() === expected) {
                return true;
            }

            await sleep(100);
        }

        return sp.Player.getShuffle() === expected;
    }

    async function shuffleQueue() {
        if (running) return;

        running = true;

        if (button) {
            button.style.pointerEvents = "none";
            button.style.opacity = "0.5";
        }

        try {
            const wasEnabled = Boolean(
                sp.Player.getShuffle()
            );

            console.info(TAG, "Shuffle requested.", {
                previousState: wasEnabled
            });

            if (wasEnabled) {
                await sp.Player.setShuffle(false);

                if (!await waitForShuffle(false)) {
                    throw new Error("Could not disable shuffle.");
                }
            }

            await sp.Player.setShuffle(true);

            if (!await waitForShuffle(true)) {
                await sp.Player.setShuffle(true);

                if (!await waitForShuffle(true)) {
                    throw new Error("Spotify did not enable shuffle.");
                }
            }

            console.info(TAG, "Shuffle enabled.");

            sp.showNotification?.("Queue shuffled! 🔀");
        } catch (error) {
            console.error(TAG, "Shuffle failed.", error);

            sp.showNotification?.(
                `Shuffle error: ${
                    error instanceof Error
                        ? error.message
                        : String(error)
                }`,
                true
            );
        } finally {
            running = false;

            if (button) {
                button.style.pointerEvents = "auto";
                button.style.opacity = "1";
            }
        }
    }

    function hideButton() {
        if (button) {
            button.style.display = "none";
        }
    }

    function updateButton() {
        button ||= createButton();

        const panel = findQueuePanel();

        if (panel) {
            const closeButton = findCloseButton(panel);

            if (closeButton) {
                const rect = closeButton.getBoundingClientRect();

                button.style.top = `${rect.top}px`;
                button.style.left = `${rect.left - 40}px`;
                button.style.right = "auto";
                button.style.display = "flex";

                return;
            }

            const rect = panel.getBoundingClientRect();

            button.style.top = `${rect.top + 8}px`;
            button.style.left = `${rect.right - 80}px`;
            button.style.right = "auto";
            button.style.display = "flex";

            return;
        }

        const pathname =
            sp.Platform?.History?.location?.pathname ||
            window.location.pathname;

        if (pathname === "/queue") {
            button.style.top = "72px";
            button.style.right = "32px";
            button.style.left = "auto";
            button.style.display = "flex";

            return;
        }

        hideButton();
    }

    function scheduleUpdate() {
        if (updateTimer) return;

        updateTimer = window.setTimeout(() => {
            updateTimer = 0;
            updateButton();
        }, 100);
    }

    observer = new MutationObserver(scheduleUpdate);

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    window.addEventListener("resize", scheduleUpdate);
    window.addEventListener("scroll", scheduleUpdate, true);

    positionInterval = window.setInterval(updateButton, 500);

    const cleanup = () => {
        observer?.disconnect();

        if (updateTimer) clearTimeout(updateTimer);
        if (positionInterval) clearInterval(positionInterval);

        window.removeEventListener("resize", scheduleUpdate);
        window.removeEventListener("scroll", scheduleUpdate, true);

        button?.remove();

        root.__gaprjShuffleQueueCleanup = null;

        console.info(TAG, "Cleanup complete.");
    };

    root.__gaprjShuffleQueueCleanup = cleanup;

    button = createButton();
    updateButton();
})();
