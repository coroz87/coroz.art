/* ============================================================
   gallery-engine.js  –  Coroz portfolio infinite gallery
   ============================================================ */

window.initGalleryEngine = function () {

    if (!window._gridInstances) window._gridInstances = [];

    const tabs = document.querySelectorAll('.tab-btn');
    const grids = document.querySelectorAll('.gallery-grid');

    /* ──────────────────────────────────────────────────────────
       TAB-SWITCH LOGIC
       switchToGrid() is the single coordinating function for all
       tab activation — from buttons, hash links, or hashchange.
    ────────────────────────────────────────────────────────── */
    function switchToGrid(targetId) {
        tabs.forEach(t => {
            t.classList.toggle('active', t.getAttribute('data-target') === targetId);
        });
        grids.forEach(g => {
            g.classList.toggle('active', g.id === targetId);
        });

        // Update hash without triggering hashchange
        const hashSlug = targetId.replace('gallery-', '');
        const newHash = '#' + hashSlug;
        if (window.location.hash !== newHash) {
            history.replaceState(null, null, newHash);
        }

        window.dispatchEvent(new Event('resize'));

        // Double rAF ensures the newly active grid is display:flex/block before we measure
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                window.dispatchEvent(new CustomEvent('gallery-tab-changed', {
                    detail: { targetId }
                }));
            });
        });
    }

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            switchToGrid(tab.getAttribute('data-target'));
        });
    });

    // Hash routing: activate the correct tab when arriving via a hash URL.
    function activateTabFromHash() {
        const hash = window.location.hash;
        if (!hash) return;
        const targetId = 'gallery-' + hash.substring(1);
        if (!document.getElementById(targetId)) return;
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                switchToGrid(targetId);
            });
        });
    }
    window.addEventListener('hashchange', activateTabFromHash);
    activateTabFromHash();

    /* ──────────────────────────────────────────────────────────
       GALLERY ARROW BUTTONS
    ────────────────────────────────────────────────────────── */
    const btnLeft = document.getElementById('gallery-arrow-left');
    const btnRight = document.getElementById('gallery-arrow-right');
    const SCROLL_STEP = 420;

    if (btnLeft && btnRight) {
        const activeGrid = () => document.querySelector('.gallery-grid.active');
        const smoothScroll = (grid, delta) => grid.scrollBy({ left: delta, behavior: 'smooth' });
        btnLeft.addEventListener('click', () => { const g = activeGrid(); if (g) smoothScroll(g, -SCROLL_STEP); });
        btnRight.addEventListener('click', () => { const g = activeGrid(); if (g) smoothScroll(g, SCROLL_STEP); });
    }

    /* ──────────────────────────────────────────────────────────
       InfiniteGrid CLASS
    ────────────────────────────────────────────────────────── */
    class InfiniteGrid {
        constructor(grid) {
            this.grid = grid;
            this.originalContent = grid.innerHTML;
            this.baseCount = grid.querySelectorAll('a').length;
            this.isActive = false;
            this.isDesktop = window.innerWidth > 768;
            this.rafId = null;
            this.geometryRafId = null;
            this.loopRunning = false;

            // Physics state
            this.isDown = false;
            this.isDragging = false;
            this.startPos = 0;
            this.scrollStart = 0;
            this.velocity = 0;
            this.prevMousePos = 0;
            this.prevTime = 0;
            this.exactScroll = 0;

            // Geometry state
            this.initialized = false;
            this.boundSize = 0;
            this.mobileBlockItems = 0;

            // Bound handlers
            this.onDragStart = (e) => e.preventDefault();
            this.onClick = this.handleClick.bind(this);
            this.onMouseDown = this.handleMouseDown.bind(this);
            this.onMouseLeave = this.handleMouseUpOrLeave.bind(this);
            this.onMouseUp = this.handleMouseUpOrLeave.bind(this);
            this.onMouseMove = this.handleMouseMove.bind(this);
            this.onWheel = this.handleWheel.bind(this);
            this.onTouchStart = this.handleTouchStart.bind(this);
            this.onTouchMove = this.handleTouchMove.bind(this);
            this.onTouchEnd = this.handleTouchEnd.bind(this);

            // Tab-change listener: ALWAYS reset to show the FIRST image when tab becomes active
            this.onTabChange = (e) => {
                if (e.detail.targetId !== this.grid.id) return;

                // Visual "fresh reload" transition: fade out immediately
                this.grid.classList.remove('grid-loaded');

                if (!this.initialized) {
                    if (this.isDesktop) { this._lockDesktopGeometry(); } else { this._lockMobileGeometry(); }
                    return;
                }

                // Clean reset to starting position
                this.resetToFirstImage();
            };
            window.addEventListener('gallery-tab-changed', this.onTabChange);

            // Recalculate geometry on resize
            this.resizeObserver = new ResizeObserver(() => {
                if (!this.initialized) return;
                if (this.isDesktop) {
                    const newBound = this.grid.scrollWidth / 5;
                    if (newBound > 0 && Math.abs(this.boundSize - newBound) > 2) {
                        const factor = this.exactScroll / (this.boundSize || 1);
                        this.boundSize = newBound;
                        this.exactScroll = factor * this.boundSize;
                        this.grid.scrollLeft = this.exactScroll;
                        this.scrollStart = this.exactScroll;
                    }
                } else {
                    const node = this.grid.children[this.mobileBlockItems];
                    if (node && node.offsetTop > 0) this.boundSize = node.offsetTop - 3;
                }
            });
            this.resizeObserver.observe(this.grid);

            this.init();
        }

        resetToFirstImage() {
            if (!this.initialized) return;

            if (this.isDesktop) {
                const sw = this.grid.scrollWidth;
                if (sw > 0) {
                    this.boundSize = sw / 5;
                    const target = this.boundSize * 2;
                    this.exactScroll = target;
                    this.grid.scrollLeft = target;
                    this.scrollStart = target;
                    this.velocity = 0;
                    // Trigger fade-in after a paint reset
                    requestAnimationFrame(() => requestAnimationFrame(() => this.grid.classList.add('grid-loaded')));
                }
            } else {
                const targetNode = this.grid.children[this.mobileBlockItems];
                if (targetNode && targetNode.offsetTop > 0) {
                    this.boundSize = targetNode.offsetTop - 3;
                    this.grid.scrollTop = this.boundSize;
                    this.velocity = 0;
                    requestAnimationFrame(() => requestAnimationFrame(() => this.grid.classList.add('grid-loaded')));
                }
            }
        }

        init() {
            const nowDesktop = window.innerWidth > 768;
            if (this.isActive && this.isDesktop === nowDesktop) return;
            this.destroy();
            this.isDesktop = nowDesktop;
            this.isActive = true;
            if (this.isDesktop) { this.initDesktop(); } else { this.initMobile(); }
            this.grid.addEventListener('dragstart', this.onDragStart);
            this.grid.addEventListener('click', this.onClick, true);
            this.grid.addEventListener('mousedown', this.onMouseDown);
            this.grid.addEventListener('mouseleave', this.onMouseLeave);
            this.grid.addEventListener('mouseup', this.onMouseUp);
            this.grid.addEventListener('mousemove', this.onMouseMove);
            this.grid.addEventListener('wheel', this.onWheel, { passive: false });
            this.grid.addEventListener('touchstart', this.onTouchStart, { passive: false });
            this.grid.addEventListener('touchmove', this.onTouchMove, { passive: false });
            this.grid.addEventListener('touchend', this.onTouchEnd);
        }

        destroy() {
            this.isActive = false;
            this.initialized = false;
            this.loopRunning = false;
            this.boundSize = 0;
            if (this.rafId) cancelAnimationFrame(this.rafId);
            if (this.geometryRafId) cancelAnimationFrame(this.geometryRafId);
            this.rafId = null;
            this.geometryRafId = null;
            this.grid.innerHTML = this.originalContent;
            this.grid.classList.remove('grid-loaded');
            this.grid.removeEventListener('dragstart', this.onDragStart);
            this.grid.removeEventListener('click', this.onClick, true);
            this.grid.removeEventListener('mousedown', this.onMouseDown);
            this.grid.removeEventListener('mouseleave', this.onMouseLeave);
            this.grid.removeEventListener('mouseup', this.onMouseUp);
            this.grid.removeEventListener('mousemove', this.onMouseMove);
            this.grid.removeEventListener('wheel', this.onWheel);
            this.grid.removeEventListener('touchstart', this.onTouchStart);
            this.grid.removeEventListener('touchmove', this.onTouchMove);
            this.grid.removeEventListener('touchend', this.onTouchEnd);
            if (this.onTabChange)
                window.removeEventListener('gallery-tab-changed', this.onTabChange);
        }

        initDesktop() {
            const perfectBlock = this.originalContent.repeat(3);
            this.grid.innerHTML = perfectBlock.repeat(5);

            const galleryId = this.grid.id.replace('gallery-', '') || 'main';
            this.grid.querySelectorAll('a').forEach(a => a.setAttribute('data-gallery', galleryId));

            this.boundSize = 0;
            this.initialized = false;
            this.grid.classList.remove('grid-loaded');

            const firstBlockCount = this.baseCount * 3;
            const allImgs = Array.from(this.grid.querySelectorAll('img'));
            const firstBlockImgs = allImgs.slice(0, firstBlockCount);

            let loaded = 0;
            const total = firstBlockImgs.length;
            let readyFired = false;

            const onReady = () => {
                if (readyFired || !this.isActive) return;
                readyFired = true;
                requestAnimationFrame(() => requestAnimationFrame(() => this._lockDesktopGeometry()));
            };

            if (total === 0) { onReady(); return; }

            firstBlockImgs.forEach(img => {
                if (img.complete && img.naturalWidth > 0) {
                    if (++loaded >= total) onReady();
                } else {
                    const done = () => { if (++loaded >= total) onReady(); };
                    img.addEventListener('load', done, { once: true });
                    img.addEventListener('error', done, { once: true });
                }
            });

            setTimeout(() => { if (!this.initialized) onReady(); }, 3000);
        }

        _lockDesktopGeometry() {
            if (!this.isActive || this.initialized) return;

            const sw = this.grid.scrollWidth;
            if (sw <= 10) {
                this.geometryRafId = requestAnimationFrame(() => this._lockDesktopGeometry());
                return;
            }

            this.boundSize = sw / 5;
            const startPos = this.boundSize * 2;
            this.exactScroll = startPos;
            this.scrollStart = startPos;
            this.grid.scrollLeft = startPos;
            this.initialized = true;

            requestAnimationFrame(() => {
                this.grid.classList.add('grid-loaded');
                window.initGalleryLightbox();
            });

            if (!this.loopRunning) {
                this.loopRunning = true;
                this.loopDesktop();
            }
        }

        loopDesktop() {
            if (!this.isActive || !this.initialized) { this.loopRunning = false; return; }
            if (!this.isDown) {
                if (Math.abs(this.velocity) > 0.1) {
                    this.velocity *= 0.98;
                    this.exactScroll -= this.velocity;
                    this.grid.scrollLeft = this.exactScroll;
                } else { this.velocity = 0; }
            }
            if (this.boundSize > 0) {
                if (this.exactScroll <= this.boundSize * 1.5) { this.exactScroll += this.boundSize; this.grid.scrollLeft = this.exactScroll; this.scrollStart += this.boundSize; }
                else if (this.exactScroll >= this.boundSize * 2.5) { this.exactScroll -= this.boundSize; this.grid.scrollLeft = this.exactScroll; this.scrollStart -= this.boundSize; }
            }
            this.rafId = requestAnimationFrame(() => this.loopDesktop());
        }

        initMobile() {
            const itemsCount = this.grid.querySelectorAll('a').length;
            if (itemsCount === 0) return;

            let repeats = Math.ceil(Math.max(40, itemsCount * 5) / itemsCount);
            while (repeats % 5 !== 0) repeats++;

            this.mobileBlockItems = itemsCount * repeats;
            const block = this.originalContent.repeat(repeats);
            this.grid.innerHTML = block + block;

            const galleryId = this.grid.id.replace('gallery-', '') || 'main';
            this.grid.querySelectorAll('a').forEach(a => a.setAttribute('data-gallery', galleryId));

            this.initialized = false;
            this.boundSize = 0;
            this.grid.classList.remove('grid-loaded');

            const firstBlockImgs = Array.from(this.grid.querySelectorAll('img')).slice(0, this.mobileBlockItems);
            let loaded = 0;
            const total = firstBlockImgs.length;
            let readyFired = false;

            const onReady = () => {
                if (readyFired || !this.isActive) return;
                readyFired = true;
                requestAnimationFrame(() => requestAnimationFrame(() => this._lockMobileGeometry()));
            };

            if (total === 0) { onReady(); return; }

            firstBlockImgs.forEach(img => {
                if (img.complete && img.naturalWidth > 0) { if (++loaded >= total) onReady(); }
                else { const done = () => { if (++loaded >= total) onReady(); }; img.addEventListener('load', done, { once: true }); img.addEventListener('error', done, { once: true }); }
            });

            setTimeout(() => { if (!this.initialized) onReady(); }, 3000);
        }

        _lockMobileGeometry() {
            if (!this.isActive || this.initialized) return;

            const targetNode = this.grid.children[this.mobileBlockItems];
            if (!targetNode || targetNode.offsetTop <= 0) { this.geometryRafId = requestAnimationFrame(() => this._lockMobileGeometry()); return; }

            this.boundSize = targetNode.offsetTop - 3;
            this.grid.scrollTop = this.boundSize;
            this.initialized = true;

            requestAnimationFrame(() => {
                this.grid.classList.add('grid-loaded');
                window.initGalleryLightbox();
            });

            if (!this.loopRunning) { this.loopRunning = true; this.loopMobile(); }
        }

        loopMobile() {
            if (!this.isActive || !this.initialized) { this.loopRunning = false; return; }
            const curr = this.grid.scrollTop;
            if (this.boundSize > 0) {
                if (curr < this.boundSize * 0.2) { this.grid.scrollTop = curr + this.boundSize; }
                else if (curr > this.boundSize * 1.5) { this.grid.scrollTop = curr - this.boundSize; }
            }
            this.rafId = requestAnimationFrame(() => this.loopMobile());
        }

        handleClick(e) { if (document.body.classList.contains('glightbox-open') || this.isDragging) { e.preventDefault(); e.stopPropagation(); } }

        startInteraction(pos) {
            this.isDown = true; this.isDragging = false; this.grid.style.cursor = 'grabbing';
            this.startPos = pos; this.scrollStart = this.isDesktop ? this.grid.scrollLeft : this.grid.scrollTop;
            this.exactScroll = this.scrollStart; this.velocity = 0; this.prevMousePos = pos; this.prevTime = Date.now();
            if (this.isDesktop) this.grid.style.scrollBehavior = 'auto';
        }

        handleMouseDown(e) { if (!document.body.classList.contains('glightbox-open')) this.startInteraction(this.isDesktop ? e.pageX - this.grid.offsetLeft : e.pageY - this.grid.offsetTop); }

        handleTouchStart(e) { if (!document.body.classList.contains('glightbox-open') && this.isDesktop) this.startInteraction(e.touches[0].pageX - this.grid.offsetLeft); }

        endInteraction() { this.isDown = false; this.grid.style.cursor = 'grab'; if (Date.now() - this.prevTime > 50) this.velocity = 0; }
        handleMouseUpOrLeave() { this.endInteraction(); }
        handleTouchEnd() { if (this.isDesktop) this.endInteraction(); }

        moveInteraction(pos, preventDefaultFn) {
            if (!this.isDown) return;
            preventDefaultFn();
            const walk = (pos - this.startPos) * 1.5;
            if (Math.abs(walk) > 5) this.isDragging = true;
            this.exactScroll = this.scrollStart - walk;
            if (this.isDesktop) this.grid.scrollLeft = this.exactScroll;
            const now = Date.now(); const dt = now - this.prevTime;
            if (dt > 0) this.velocity = ((pos - this.prevMousePos) / dt) * 2.4;
            this.prevTime = now; this.prevMousePos = pos;
        }

        handleMouseMove(e) { if (this.isDown) this.moveInteraction(this.isDesktop ? e.pageX - this.grid.offsetLeft : e.pageY - this.grid.offsetTop, () => e.preventDefault()); }
        handleTouchMove(e) { if (this.isDesktop && this.isDown) { const touch = e.touches[0]; this.moveInteraction(touch.pageX - this.grid.offsetLeft, () => { if (Math.abs(touch.pageX - this.startPos) > Math.abs(touch.pageY - this.startPos)) e.preventDefault(); }); } }
        handleWheel(e) { if (this.isDesktop && e.deltaY !== 0) { e.preventDefault(); this.velocity += e.deltaY * 0.036; } }
    }

    window.initGalleryLightbox = function () {
        if (window.corozLightbox) { try { window.corozLightbox.destroy(); } catch (_) { } }
        if (typeof GLightbox !== 'undefined') {
            window.corozLightbox = GLightbox({
                selector: '.glightbox, .zoom',
                touchNavigation: true,
                loop: true,
                autoplayVideos: true,
                dragToleranceX: 40,
                dragToleranceY: 150,
                zoomable: true,
                draggable: false, // Prevents conflict with zoom/wheel
                moreLength: 1000
            });
        }
    };

    const gridInstances = [];
    grids.forEach(grid => gridInstances.push(new InfiniteGrid(grid)));
    window._gridInstances = gridInstances;

    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => { gridInstances.forEach(inst => inst.init()); }, 250);
    });

    window.initGalleryLightbox();

    const bottomTrack = document.getElementById('bottom-track');
    if (bottomTrack) {
        bottomTrack.addEventListener('dragstart', e => e.preventDefault());
        bottomTrack.style.willChange = 'scroll-position';
        bottomTrack.style.webkitTransform = 'translateZ(0)';
        bottomTrack.style.transform = 'translateZ(0)';

        const originalHTML = bottomTrack.innerHTML;
        bottomTrack.innerHTML = originalHTML.repeat(5);
        bottomTrack.querySelectorAll('a').forEach(a => a.setAttribute('data-gallery', 'bottom-slider'));

        let sliderInitialized = false;

        const initializeSlider = () => {
            if (sliderInitialized || !bottomTrack.isConnected) return;
            sliderInitialized = true;
            const blockWidth = bottomTrack.scrollWidth / 5;
            let exactScrollLeft = blockWidth * 2;
            bottomTrack.scrollLeft = exactScrollLeft;

            let isDown = false, isDragging = false, startX, scrollLeftStart, velocity = 0, prevMouseX = 0, prevTime = 0, firstFrame = false;

            const momentumLoop = () => {
                if (!isDown) {
                    exactScrollLeft += 0.25;
                    if (Math.abs(velocity) > 0.1) { velocity *= 0.98; exactScrollLeft -= velocity; }
                    else { velocity = 0; }
                    bottomTrack.scrollLeft = exactScrollLeft;
                }
                if (exactScrollLeft >= blockWidth * 2.5) { exactScrollLeft -= blockWidth; bottomTrack.scrollLeft = exactScrollLeft; if (scrollLeftStart !== undefined) scrollLeftStart -= blockWidth; }
                else if (exactScrollLeft <= blockWidth * 1.5) { exactScrollLeft += blockWidth; bottomTrack.scrollLeft = exactScrollLeft; if (scrollLeftStart !== undefined) scrollLeftStart += blockWidth; }
                if (!firstFrame) { firstFrame = true; bottomTrack.classList.add('grid-loaded'); }
                requestAnimationFrame(momentumLoop);
            };
            requestAnimationFrame(momentumLoop);

            const startInter = (x) => { isDown = true; isDragging = false; startX = x; scrollLeftStart = exactScrollLeft; velocity = 0; prevMouseX = x; prevTime = Date.now(); bottomTrack.style.cursor = 'grabbing'; };
            const endInter = () => { isDown = false; bottomTrack.style.cursor = 'pointer'; };
            const moveInter = (x, pFn) => { if (!isDown) return; pFn(); const walk = (x - startX) * 2; if (Math.abs(walk) > 5) isDragging = true; exactScrollLeft = scrollLeftStart - walk; bottomTrack.scrollLeft = exactScrollLeft; const now = Date.now(); const dt = now - prevTime; if (dt > 0) velocity = ((x - prevMouseX) / dt) * 3.6; prevTime = now; prevMouseX = x; };

            bottomTrack.addEventListener('mousedown', e => startInter(e.pageX - bottomTrack.offsetLeft));
            window.addEventListener('mouseup', endInter);
            bottomTrack.addEventListener('mousemove', e => moveInter(e.pageX - bottomTrack.offsetLeft, () => e.preventDefault()));
            bottomTrack.addEventListener('touchstart', e => startInter(e.touches[0].pageX - bottomTrack.offsetLeft), { passive: false });
            bottomTrack.addEventListener('touchend', endInter);
            bottomTrack.addEventListener('touchmove', e => moveInter(e.touches[0].pageX - bottomTrack.offsetLeft, () => e.preventDefault()), { passive: false });
            bottomTrack.addEventListener('wheel', e => { if (e.deltaY !== 0) { e.preventDefault(); velocity += e.deltaY * 0.036; } }, { passive: false });
            bottomTrack.addEventListener('click', e => { if (isDragging) { e.preventDefault(); e.stopPropagation(); } }, true);
            window.initGalleryLightbox();
        };

        const sliderImgs = Array.from(bottomTrack.querySelectorAll('img'));
        let sliderLoaded = 0;
        const totalSlider = sliderImgs.length;
        const onSliderReady = () => { requestAnimationFrame(() => requestAnimationFrame(initializeSlider)); };
        if (totalSlider === 0) { onSliderReady(); }
        else {
            sliderImgs.forEach(img => { if (img.complete) { if (++sliderLoaded >= totalSlider) onSliderReady(); } else { img.addEventListener('load', () => { if (++sliderLoaded >= totalSlider) onSliderReady(); }, { once: true }); } });
        }
        setTimeout(() => { if (!sliderInitialized) onSliderReady(); }, 3000);
    }
};

document.addEventListener('DOMContentLoaded', window.initGalleryEngine);
