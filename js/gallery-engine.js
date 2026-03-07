/* ============================================================
   gallery-engine.js  –  Coroz portfolio infinite gallery
   Fixed for Safari/WebKit + Chromium/Blink, all navigation modes
   ============================================================ */

window.initGalleryEngine = function () {

    /* ──────────────────────────────────────────────────────────
       1.  STATE  –  keep track of all InfiniteGrid instances so
           we can cleanly destroy them before a re-init
    ────────────────────────────────────────────────────────── */
    if (!window._gridInstances) window._gridInstances = [];

    const tabs = document.querySelectorAll('.tab-btn');
    const grids = document.querySelectorAll('.gallery-grid');

    /* ──────────────────────────────────────────────────────────
       2.  TAB-SWITCH LOGIC
           switchToGrid() is the single source of truth for
           activating a gallery tab.  It is always rAF-deferred so
           the browser has painted the newly .active grid before we
           try to measure or reset scroll position.
    ────────────────────────────────────────────────────────── */
    function switchToGrid(targetId) {
        // Update tab visual state
        tabs.forEach(t => {
            t.classList.toggle('active', t.getAttribute('data-target') === targetId);
        });

        // Update grid visibility
        grids.forEach(g => {
            g.classList.toggle('active', g.id === targetId);
        });

        // Update hash without triggering hashchange
        const hashSlug = targetId.replace('gallery-', '');
        history.replaceState(null, null, '#' + hashSlug);

        // Dispatch resize so grid recalculates any flex/grid dimensions
        window.dispatchEvent(new Event('resize'));

        // Defer the reset notification so the newly visible grid has
        // been painted before InfiniteGrid tries to read scrollWidth/offsetTop
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                window.dispatchEvent(new CustomEvent('gallery-tab-changed', {
                    detail: { targetId }
                }));
            });
        });
    }

    /* Wire tab buttons */
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetId = tab.getAttribute('data-target');
            switchToGrid(targetId);
        });
    });

    /* Hash routing — treat any navigation (including first load with
       a hash) as a fresh "switch to that tab" request.
       We defer with rAF so all InfiniteGrid instances are created first. */
    function activateTabFromHash() {
        const hash = window.location.hash;
        if (!hash) return;
        const slug = hash.substring(1);               // e.g. "graphic_design"
        const targetId = 'gallery-' + slug;           // e.g. "gallery-graphic_design"
        const targetGrid = document.getElementById(targetId);
        if (!targetGrid) return;
        // Use two rAF frames so InfiniteGrid constructors have run
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                switchToGrid(targetId);
            });
        });
    }

    window.addEventListener('hashchange', activateTabFromHash);
    activateTabFromHash();   // fires async via inner rAF, safe on page load

    /* ──────────────────────────────────────────────────────────
       3.  GALLERY ARROW BUTTONS
    ────────────────────────────────────────────────────────── */
    const btnLeft = document.getElementById('gallery-arrow-left');
    const btnRight = document.getElementById('gallery-arrow-right');
    const SCROLL_STEP = 420;

    if (btnLeft && btnRight) {
        const activeGrid = () => document.querySelector('.gallery-grid.active');
        const smoothScroll = (grid, delta) =>
            grid.scrollBy({ left: delta, behavior: 'smooth' });

        btnLeft.addEventListener('click', () => { const g = activeGrid(); if (g) smoothScroll(g, -SCROLL_STEP); });
        btnRight.addEventListener('click', () => { const g = activeGrid(); if (g) smoothScroll(g, SCROLL_STEP); });
    }

    /* ──────────────────────────────────────────────────────────
       4.  InfiniteGrid CLASS
    ────────────────────────────────────────────────────────── */
    class InfiniteGrid {
        constructor(grid) {
            this.grid = grid;
            this.originalContent = grid.innerHTML;
            this.baseCount = grid.querySelectorAll('a').length;
            this.isActive = false;
            this.isDesktop = window.innerWidth > 768;
            this.rafId = null;

            // Scroll physics state
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
            this.geometryRafId = null;   // for geometry polling loop

            /* Bound event handlers */
            this.onDragStart = (e) => e.preventDefault();
            this.onClick = this.handleClick.bind(this);
            this.onMouseDown = this.handleMouseDown.bind(this);
            this.onMouseLeave = this.handleMouseUpOrLeave.bind(this);
            this.onMouseUp = this.handleMouseUpOrLeave.bind(this);
            this.onMouseMove = this.handleMouseMove.bind(this);
            this.onWheel = this.handleWheel.bind(this);
            this.onTouchStart = this.handleTouchStart.bind(this);
            this.onTouchMove = this.handleTouchMove.bind(this);   // FIX: was missing
            this.onTouchEnd = this.handleTouchEnd.bind(this);

            /* Tab-change listener — reset to first image on tab switch */
            this.onTabChange = (e) => {
                if (e.detail.targetId !== this.grid.id) return;
                if (!this.initialized) return;   // wait; geometry not ready yet

                if (this.isDesktop) {
                    // Two rAF frames: one to make the grid .active, one to paint
                    requestAnimationFrame(() => {
                        if (this.grid.scrollWidth > 0) {
                            // Recalculate in case viewport changed between tabs
                            this.boundSize = this.grid.scrollWidth / 5;
                            const target = this.boundSize * 2;
                            this.exactScroll = target;
                            this.scrollStart = target;
                            this.grid.scrollLeft = target;
                        }
                    });
                } else {
                    requestAnimationFrame(() => {
                        const node = this.grid.children[this.mobileBlockItems];
                        if (node && node.offsetTop > 0) {
                            this.boundSize = node.offsetTop - 3;
                            this.grid.scrollTop = this.boundSize;
                        }
                    });
                }
            };
            window.addEventListener('gallery-tab-changed', this.onTabChange);

            /* ResizeObserver updates geometry when viewport changes */
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
                    if (node && node.offsetTop > 0) {
                        this.boundSize = node.offsetTop - 3;
                    }
                }
            });
            this.resizeObserver.observe(this.grid);

            this.init();
        }

        /* ── init ── */
        init() {
            const currentIsDesktop = window.innerWidth > 768;

            // Avoid re-init if mode hasn't changed
            if (this.isActive && this.isDesktop === currentIsDesktop) return;

            this.destroy();
            this.isDesktop = currentIsDesktop;
            this.isActive = true;

            if (this.isDesktop) {
                this.initDesktop();
            } else {
                this.initMobile();
            }

            // Attach interaction events
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

        /* ── destroy ── */
        destroy() {
            this.isActive = false;
            if (this.rafId) cancelAnimationFrame(this.rafId);
            if (this.geometryRafId) cancelAnimationFrame(this.geometryRafId);
            this.rafId = null;
            this.geometryRafId = null;
            this.initialized = false;
            this.boundSize = 0;

            // Restore original HTML (removes clones)
            this.grid.innerHTML = this.originalContent;

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

        /* ══════════════════════════════════════════════════════
           DESKTOP — Horizontal CSS Grid
        ══════════════════════════════════════════════════════ */
        initDesktop() {
            /* Repeat content so total items are a multiple of 3 (nth-child pattern).
               5 blocks = scrollWidth is always exactly divisible by 5, no rounding. */
            const perfectBlock = this.originalContent.repeat(3);
            this.grid.innerHTML = perfectBlock.repeat(5);
            this.boundSize = 0;
            this.initialized = false;

            /* Phase 1: hide until geometry is confirmed */
            this.grid.classList.remove('grid-loaded');

            /* Phase 2: RAF-based geometry polling.
               We do NOT rely on image-load callbacks on the cloned DOM — Safari can
               report img.complete=true before layout is flushed.  Instead we poll
               scrollWidth until it is non-zero, then immediately lock geometry and
               start the loop.  The grid fades in only after scrollLeft is committed. */
            this._pollDesktopGeometry();
        }

        _pollDesktopGeometry() {
            if (!this.isActive) return;

            const sw = this.grid.scrollWidth;
            if (sw > 10) {
                // Geometry is ready: lock in, set position, start loop
                this.boundSize = sw / 5;
                const startPos = this.boundSize * 2;   // block #3 (0-indexed)
                this.exactScroll = startPos;
                this.scrollStart = startPos;
                this.grid.scrollLeft = startPos;
                this.initialized = true;

                // Reveal on the very next paint — position is already committed
                requestAnimationFrame(() => {
                    this.grid.classList.add('grid-loaded');
                });

                this.loopDesktop();
                return;
            }

            // scrollWidth not ready yet — try again next frame (Safari needs this)
            this.geometryRafId = requestAnimationFrame(() => this._pollDesktopGeometry());
        }

        loopDesktop() {
            if (!this.isActive) return;

            if (!this.initialized) {
                this.rafId = requestAnimationFrame(() => this.loopDesktop());
                return;
            }

            // Apply momentum/friction when not dragging
            if (!this.isDown) {
                if (Math.abs(this.velocity) > 0.1) {
                    this.velocity *= 0.98;
                    this.exactScroll -= this.velocity;
                    this.grid.scrollLeft = this.exactScroll;
                } else {
                    this.velocity = 0;
                }
            }

            // Seamless wrap: stay centred around block 2×boundSize
            if (this.boundSize > 0) {
                if (this.exactScroll <= this.boundSize * 1.5) {
                    this.exactScroll += this.boundSize;
                    this.grid.scrollLeft = this.exactScroll;
                    this.scrollStart += this.boundSize;
                } else if (this.exactScroll >= this.boundSize * 2.5) {
                    this.exactScroll -= this.boundSize;
                    this.grid.scrollLeft = this.exactScroll;
                    this.scrollStart -= this.boundSize;
                }
            }

            this.rafId = requestAnimationFrame(() => this.loopDesktop());
        }

        /* ══════════════════════════════════════════════════════
           MOBILE — Vertical flex-wrap masonry
        ══════════════════════════════════════════════════════ */
        initMobile() {
            const itemsCount = this.grid.querySelectorAll('a').length;
            if (itemsCount === 0) return;

            /* Enough items to never hit the top or bottom edge on fast scroll. */
            let minItems = Math.max(40, itemsCount * 5);
            let repeats = Math.ceil(minItems / itemsCount);
            while (repeats % 5 !== 0) repeats++;          // keep nth-child(5n) pattern intact

            this.mobileBlockItems = itemsCount * repeats;

            const block = this.originalContent.repeat(repeats);
            this.grid.innerHTML = block + block;           // two super-blocks

            this.initialized = false;
            this.boundSize = 0;
            this.grid.classList.remove('grid-loaded');

            // Defer start to give the browser time to lay out the vertical grid
            this.geometryRafId = requestAnimationFrame(() => {
                requestAnimationFrame(() => this._pollMobileGeometry());
            });
        }

        _pollMobileGeometry() {
            if (!this.isActive) return;

            // The target node is the first item of the second super-block
            const targetNode = this.grid.children[this.mobileBlockItems];
            if (targetNode && targetNode.offsetTop > 0) {
                this.boundSize = targetNode.offsetTop - 3;
                this.grid.scrollTop = this.boundSize;
                this.initialized = true;

                // Reveal on the very next paint
                requestAnimationFrame(() => {
                    this.grid.classList.add('grid-loaded');
                });

                this.loopMobile();
                return;
            }

            // offsetTop still 0 (hidden or not laid out) — retry next frame
            this.geometryRafId = requestAnimationFrame(() => this._pollMobileGeometry());
        }

        loopMobile() {
            if (!this.isActive) return;

            if (this.initialized && this.boundSize > 0) {
                const curr = this.grid.scrollTop;

                // Let native momentum handle everything; only teleport at the edges
                if (curr < this.boundSize * 0.2) {
                    this.grid.scrollTop = curr + this.boundSize;
                } else if (curr > this.boundSize * 1.5) {
                    this.grid.scrollTop = curr - this.boundSize;
                }
            }

            this.rafId = requestAnimationFrame(() => this.loopMobile());
        }

        /* ══════════════════════════════════════════════════════
           EVENT HANDLERS
        ══════════════════════════════════════════════════════ */
        handleClick(e) {
            if (document.body.classList.contains('glightbox-open')) return;
            if (this.isDragging) {
                e.preventDefault();
                e.stopPropagation();
            }
        }

        startInteraction(pos) {
            this.isDown = true;
            this.isDragging = false;
            this.grid.style.cursor = 'grabbing';
            this.startPos = pos;
            this.scrollStart = this.isDesktop ? this.grid.scrollLeft : this.grid.scrollTop;
            this.exactScroll = this.scrollStart;
            this.velocity = 0;
            this.prevMousePos = pos;
            this.prevTime = Date.now();
            if (this.isDesktop) this.grid.style.scrollBehavior = 'auto';
        }

        handleMouseDown(e) {
            if (document.body.classList.contains('glightbox-open')) return;
            const pos = this.isDesktop
                ? e.pageX - this.grid.offsetLeft
                : e.pageY - this.grid.offsetTop;
            this.startInteraction(pos);
        }

        handleTouchStart(e) {
            if (document.body.classList.contains('glightbox-open')) return;
            if (!this.isDesktop) return;   // mobile uses native scroll
            const touch = e.touches[0];
            this.startInteraction(touch.pageX - this.grid.offsetLeft);
        }

        endInteraction() {
            this.isDown = false;
            this.grid.style.cursor = 'grab';
            if (Date.now() - this.prevTime > 50) this.velocity = 0;
        }

        handleMouseUpOrLeave() { this.endInteraction(); }
        handleTouchEnd() { if (this.isDesktop) this.endInteraction(); }

        moveInteraction(pos, preventDefaultFn) {
            if (!this.isDown) return;
            preventDefaultFn();

            const walk = (pos - this.startPos) * 1.5;
            if (Math.abs(walk) > 5) this.isDragging = true;

            this.exactScroll = this.scrollStart - walk;
            if (this.isDesktop) this.grid.scrollLeft = this.exactScroll;

            const now = Date.now();
            const dt = now - this.prevTime;
            if (dt > 0) this.velocity = ((pos - this.prevMousePos) / dt) * 2.4;
            this.prevTime = now;
            this.prevMousePos = pos;
        }

        handleMouseMove(e) {
            if (!this.isDown) return;
            const pos = this.isDesktop
                ? e.pageX - this.grid.offsetLeft
                : e.pageY - this.grid.offsetTop;
            this.moveInteraction(pos, () => e.preventDefault());
        }

        handleTouchMove(e) {
            if (!this.isDesktop || !this.isDown) return;
            const touch = e.touches[0];
            const pos = touch.pageX - this.grid.offsetLeft;
            this.moveInteraction(pos, () => {
                if (Math.abs(touch.pageX - this.startPos) > Math.abs(touch.pageY - this.startPos))
                    e.preventDefault();
            });
        }

        handleWheel(e) {
            if (!this.isDesktop) return;
            if (e.deltaY !== 0) {
                e.preventDefault();
                this.velocity += e.deltaY * 0.036;
            }
        }
    }

    /* ── Create instances ── */
    const gridInstances = [];
    grids.forEach(grid => gridInstances.push(new InfiniteGrid(grid)));
    window._gridInstances = gridInstances;

    /* Reinit on resize (desktop↔mobile breakpoint crossing) */
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            gridInstances.forEach(inst => inst.init());
        }, 250);
    });

    /* ──────────────────────────────────────────────────────────
       5.  BOTTOM SLIDER — Safari-safe 5-block infinite scroll
    ────────────────────────────────────────────────────────── */
    const bottomTrack = document.getElementById('bottom-track');
    if (!bottomTrack) return;

    // Bottom slider is hidden on mobile — skip all work to avoid wasted RAF loops,
    // cloning overhead, and the blockWidth=0 zero-division path in initializeSlider.
    if (window.innerWidth <= 768) return;

    bottomTrack.addEventListener('dragstart', e => e.preventDefault());

    // GPU composite layer — eliminates Safari repaint flicker
    bottomTrack.style.willChange = 'scroll-position';
    bottomTrack.style.webkitTransform = 'translateZ(0)';
    bottomTrack.style.transform = 'translateZ(0)';

    // 5 clones → blockWidth = scrollWidth / 5 (always exact)
    const originalHTML = bottomTrack.innerHTML;
    bottomTrack.innerHTML = originalHTML.repeat(5);

    let sliderInitialized = false;

    const initializeSlider = () => {
        if (sliderInitialized) return;
        sliderInitialized = true;

        const blockWidth = bottomTrack.scrollWidth / 5;
        let exactScrollLeft = blockWidth * 2;
        bottomTrack.scrollLeft = exactScrollLeft;

        let isDown = false;
        let isDragging = false;
        let startX;
        let scrollLeftStart = exactScrollLeft;
        let velocity = 0;
        let prevMouseX = 0;
        let prevTime = 0;
        let firstFrame = false;

        const momentumLoop = () => {
            if (!isDown) {
                exactScrollLeft += 0.25;            // constant conveyor-belt

                if (Math.abs(velocity) > 0.1) {
                    velocity *= 0.98;
                    exactScrollLeft -= velocity;
                } else {
                    velocity = 0;
                }
                bottomTrack.scrollLeft = exactScrollLeft;
            }

            // Seamless wrap
            if (exactScrollLeft >= blockWidth * 2.5) {
                exactScrollLeft -= blockWidth;
                bottomTrack.scrollLeft = exactScrollLeft;
                scrollLeftStart -= blockWidth;
            } else if (exactScrollLeft <= blockWidth * 1.5) {
                exactScrollLeft += blockWidth;
                bottomTrack.scrollLeft = exactScrollLeft;
                scrollLeftStart += blockWidth;
            }

            // Fade in on first rendered frame (position already committed)
            if (!firstFrame) {
                firstFrame = true;
                bottomTrack.classList.add('grid-loaded');
            }

            requestAnimationFrame(momentumLoop);
        };
        requestAnimationFrame(momentumLoop);

        /* Interactions */
        bottomTrack.addEventListener('click', e => {
            if (isDragging) { e.preventDefault(); e.stopPropagation(); }
        }, true);

        bottomTrack.addEventListener('mousedown', e => {
            isDown = true; isDragging = false;
            bottomTrack.style.cursor = 'grabbing';
            startX = e.pageX - bottomTrack.offsetLeft;
            scrollLeftStart = exactScrollLeft;
            velocity = 0; prevMouseX = startX; prevTime = Date.now();
        });

        bottomTrack.addEventListener('mouseleave', () => {
            isDown = false; bottomTrack.style.cursor = 'pointer';
            if (Date.now() - prevTime > 50) velocity = 0;
        });

        bottomTrack.addEventListener('mouseup', () => {
            isDown = false; bottomTrack.style.cursor = 'pointer';
            if (Date.now() - prevTime > 50) velocity = 0;
        });

        bottomTrack.addEventListener('mousemove', e => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX - bottomTrack.offsetLeft;
            const walk = (x - startX) * 2;
            if (Math.abs(walk) > 5) isDragging = true;
            exactScrollLeft = scrollLeftStart - walk;
            bottomTrack.scrollLeft = exactScrollLeft;
            const now = Date.now(); const dt = now - prevTime;
            if (dt > 0) velocity = ((x - prevMouseX) / dt) * 3.6;
            prevTime = now; prevMouseX = x;
        });

        bottomTrack.addEventListener('wheel', e => {
            if (e.deltaY !== 0) { e.preventDefault(); velocity += e.deltaY * 0.036; }
        }, { passive: false });
    };

    /* ── RAF-based geometry poll for the bottom slider (same pattern as main grids) ── */
    const pollBottomSlider = () => {
        if (bottomTrack.scrollWidth > 10) {
            initializeSlider();
        } else {
            requestAnimationFrame(pollBottomSlider);
        }
    };

    // Give the browser one rAF to flush the cloned DOM layout
    requestAnimationFrame(() => requestAnimationFrame(pollBottomSlider));

    /* Failsafe: if rAF poll somehow never fires (Safari background tab), init after 1.5 s */
    setTimeout(() => { if (!sliderInitialized) initializeSlider(); }, 1500);
};

/* ──────────────────────────────────────────────────────────
   BOOT
────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', window.initGalleryEngine);

/* Safari bfcache fix: when the user presses Back, Safari restores the frozen
   page from memory WITHOUT firing DOMContentLoaded. The gallery instances from
   the previous visit persist but are in a stale/broken state.
   pageshow with e.persisted=true is the only reliable hook for this case. */
window.addEventListener('pageshow', function (e) {
    if (e.persisted) {
        // Destroy any stale instances left over from the frozen page
        if (window._gridInstances) {
            window._gridInstances.forEach(function (inst) {
                try { inst.destroy(); } catch (_) { }
            });
            window._gridInstances = [];
        }
        // Re-run the full engine — geometry polling will remeasure correctly
        window.initGalleryEngine();
    }
});

