// @ts-check
// Name: Remove Video Tag
// Author: gaprj
// Description: Completely removes the Music Video badge (icon, text, separator, and spacing) globally, aligning artists perfectly.

(function RemoveVideoTag() {
    const TARGETS = ["Video musicale", "Music Video"];
    const BUTTON_LABELS = ["Passa a video", "Switch to video"];

    const buttonSelector = (suffix = '') =>
        BUTTON_LABELS
            .flatMap(l => ['aria-label', 'title'].map(a => `[data-encore-id="buttonTertiary"][${a}="${l}"]${suffix}`))
            .join(', ');

    const TAG_ICON_SELECTORS = TARGETS
        .map(t => `[aria-label="${t}"], [title="${t}"], [data-tooltip="${t}"]`)
        .join(', ');

    const HIDDEN_ATTR = 'data-rvt-hidden';
    const FLUSH_ATTR = 'data-rvt-flush';
    const ARTISTS_WRAPPER = '.main-watchFeed-contentWrapper';
    const ROW_SELECTOR = '.main-trackInfo-container, .main-trackInfo-artists, .main-trackInfo-name, [role="row"], [role="gridcell"]';

    const style = document.createElement('style');
    style.textContent = `
        ${buttonSelector()} { display: none !important; }
        ${buttonSelector(' + *')} { margin-inline-start: 0 !important; }
        [${HIDDEN_ATTR}] { display: none !important; }
        [${HIDDEN_ATTR}] + * { margin-inline-start: 0 !important; }
        [${FLUSH_ATTR}] { padding-inline-start: 0 !important; margin-inline-start: 0 !important; }
    `;
    (document.head || document.documentElement).appendChild(style);

    const isTarget = (s) => TARGETS.some(t => (s || '').trim() === t);

    function findTagIcons() {
        const icons = new Set();
        document.querySelectorAll(TAG_ICON_SELECTORS).forEach(el => icons.add(el));
        document.querySelectorAll('svg title, svg desc').forEach(t => {
            if (isTarget(t.textContent)) {
                const svg = t.closest('svg');
                if (svg) icons.add(svg);
            }
        });
        return icons;
    }

    function hideWithWrappers(el) {
        let target = el;
        for (let i = 0; i < 4; i++) {
            const parent = target.parentElement;
            if (!parent || parent === document.body || parent.matches(ROW_SELECTOR)) break;
            if (parent.children.length !== 1) break;
            const hasOwnText = Array.from(parent.childNodes).some(
                n => n.nodeType === Node.TEXT_NODE && (n.textContent || '').trim() !== ''
            );
            if (hasOwnText) break;
            target = parent;
        }
        target.setAttribute(HIDDEN_ATTR, '');
        return target;
    }

    function hideSeparatorNear(el) {
        const next = el.nextElementSibling;
        if (next && next.hasAttribute(HIDDEN_ATTR)) return;
        const isBullet = (e) => !!e && (e.textContent || '').trim() === '•';
        const prev = el.previousElementSibling;
        const bullet = isBullet(next) ? next : (isBullet(prev) ? prev : null);
        if (bullet) bullet.setAttribute(HIDDEN_ATTR, '');
    }

    function collapseEmptyAncestors(el) {
        let outer = el;
        let node = el.parentElement;
        for (let i = 0; i < 4; i++) {
            if (!node || node === document.body || node.matches(ROW_SELECTOR)) break;
            if (!node.hasAttribute(HIDDEN_ATTR)) {
                const allChildrenHidden = Array.from(node.children).every(c => c.hasAttribute(HIDDEN_ATTR));
                const hasOwnText = Array.from(node.childNodes).some(
                    n => n.nodeType === Node.TEXT_NODE && (n.textContent || '').trim() !== ''
                );
                if (!allChildrenHidden || hasOwnText) break;
                node.setAttribute(HIDDEN_ATTR, '');
            }
            outer = node;
            node = node.parentElement;
        }
        return outer;
    }

    function flushArtistsAfter(outer) {
        let scope = outer.parentElement;
        for (let i = 0; i < 3 && scope && scope !== document.body; i++) {
            for (const w of Array.from(scope.querySelectorAll(ARTISTS_WRAPPER))) {
                const follows = outer.compareDocumentPosition(w) & Node.DOCUMENT_POSITION_FOLLOWING;
                if (follows && !outer.contains(w)) {
                    w.setAttribute(FLUSH_ATTR, '');
                    return;
                }
            }
            if (scope.matches('.main-trackInfo-container, [role="row"]')) break;
            scope = scope.parentElement;
        }
    }

    function trimSpaceAfter(el) {
        let next = el.nextSibling;
        while (next && next.nodeType === Node.TEXT_NODE) {
            const t = next.textContent || '';
            if (t.trim() === '') {
                next.textContent = '';
                next = next.nextSibling;
                continue;
            }
            if (/^\s/.test(t)) next.textContent = t.replace(/^\s+/, '');
            break;
        }
    }

    function processContainer(container, hasIcon) {
        if (!container) return;
        const hasText = TARGETS.some(t => (container.textContent || '').includes(t));
        if (!hasText && !hasIcon) return;

        const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
            acceptNode: (n) => {
                const p = n.parentElement;
                return p && p.closest(`svg, [${HIDDEN_ATTR}]`)
                    ? NodeFilter.FILTER_REJECT
                    : NodeFilter.FILTER_ACCEPT;
            }
        });

        let node;
        let removedTagOrDot = hasIcon;
        let foundFirstArtist = false;

        while ((node = walker.nextNode())) {
            let text = node.textContent || '';
            const originalText = text;

            for (const t of TARGETS) {
                if (text.includes(t)) {
                    text = text.replace(t, '');
                    removedTagOrDot = true;
                }
            }

            if (!foundFirstArtist && text.includes('•')) {
                text = text.replace('•', '');
                removedTagOrDot = true;
            }

            if (removedTagOrDot && !foundFirstArtist) {
                if (text.trim() === '') {
                    text = '';
                } else {
                    text = text.replace(/^\s+/, '');
                    foundFirstArtist = true;
                }
            }

            if (text !== originalText) {
                node.textContent = text;
            }
        }
    }

    function cleanDOM() {
        document.querySelectorAll(`[${FLUSH_ATTR}]`).forEach(el => el.removeAttribute(FLUSH_ATTR));

        document.querySelectorAll(buttonSelector()).forEach(btn => {
            const wrapper = btn.closest(`[${HIDDEN_ATTR}]`) || hideWithWrappers(btn);
            hideSeparatorNear(wrapper);
            const outer = collapseEmptyAncestors(wrapper);
            trimSpaceAfter(outer);
            flushArtistsAfter(outer);
        });

        findTagIcons().forEach(icon => {
            if (icon.closest(`[${HIDDEN_ATTR}]`)) return;
            const wrapper = hideWithWrappers(icon);
            const container = wrapper.closest('.main-trackInfo-container') || wrapper.parentElement;
            processContainer(container, true);
        });

        const xpath = `//text()[contains(., 'Video musicale') or contains(., 'Music Video')]`;
        const textNodes = document.evaluate(xpath, document.body, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);

        for (let i = 0; i < textNodes.snapshotLength; i++) {
            const node = textNodes.snapshotItem(i);
            if (!node) continue;
            const parent = node.parentElement;
            if (!parent || parent.closest(`svg, script, style, [${HIDDEN_ATTR}]`)) continue;

            let container = parent.closest('.main-trackInfo-container');
            if (!container) {
                container = parent;
                while (container && container.parentElement && (container.textContent || '').trim() === (node.textContent || '').trim()) {
                    container = container.parentElement;
                }
                container = container.parentElement || container;
            }
            if (container) processContainer(container, false);
        }
    }

    let scheduled = false;
    function scheduleClean() {
        if (scheduled) return;
        scheduled = true;
        setTimeout(() => {
            scheduled = false;
            cleanDOM();
        }, 50);
    }

    const observer = new MutationObserver((mutations) => {
        for (const m of mutations) {
            if (m.addedNodes.length > 0 || m.type === 'characterData') {
                scheduleClean();
                break;
            }
        }
    });

    const startObserver = setInterval(() => {
        if (document.body) {
            clearInterval(startObserver);
            observer.observe(document.body, { childList: true, subtree: true, characterData: true });
            cleanDOM();
            console.log('[RemoveVideoTag] loaded');
        }
    }, 500);
})();
