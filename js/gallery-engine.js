window.initGalleryEngine = function () {
    const tabs = document.querySelectorAll('.tab-btn');
    const grids = document.querySelectorAll('.gallery-grid');

    // --- Hash Routing Logic ---
    const activateTabFromHash = () => {
        const hash = window.location.hash;
        if (hash) {
            const targetBtn = document.querySelector(`.tab-btn[data-target="gallery-${hash.substring(1)}"]`);
            if (targetBtn) {
                targetBtn.click();
            }
        }
    };

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetUrl = tab.getAttribute('data-url');

            // If this tab has a URL, navigate to the dedicated page instead of switching inline
            if (targetUrl) {
                // Use PJAX navigation if available (myscript.js exposes window.pjaxNavigate)
                if (typeof window.pjaxNavigate === 'function') {
                    window.pjaxNavigate(targetUrl);
                } else {
                    window.location.href = targetUrl;
                }
                return; // Don't do inline switching
            }

            // Remove active from all tabs & grids
            tabs.forEach(t => t.classList.remove('active'));
            grids.forEach(g => g.classList.remove('active'));

            // Add active to targeted tab & grid
            tab.classList.add('active');
            const targetId = tab.getAttribute('data-target');
            document.getElementById(targetId).classList.add('active');

            // Update URL hash without jumping page
            history.replaceState(null, null, '#' + targetId.replace('gallery-', ''));

            // Force grids to recalculate layout if they were hidden
            window.dispatchEvent(new Event('resize'));
        });
    });

    // Listen to browser forward/back or cross-page hash changes
    window.addEventListener('hashchange', activateTabFromHash);

    // Trigger immediately if a user arrives via a hash link
    activateTabFromHash();

    // --- Gallery Arrow Scroll Logic ---
    const btnLeft = document.getElementById('gallery-arrow-left');
    const btnRight = document.getElementById('gallery-arrow-right');
    const SCROLL_STEP = 420;

    if (btnLeft && btnRight) {
        const activeGrid = () => document.querySelector('.gallery-grid.active');
        const smoothScroll = (grid, delta) => grid.scrollBy({ left: delta, behavior: 'smooth' });

        btnLeft.addEventListener('click', () => {
            const g = activeGrid(); if (g) smoothScroll(g, -SCROLL_STEP);
        });
        btnRight.addEventListener('click', () => {
            const g = activeGrid(); if (g) smoothScroll(g, SCROLL_STEP);
        });
    }

    // Responsive Infinite Scrolling (Desktop horizontal / Mobile vertical)
    class InfiniteGrid {
        constructor(grid) {
            this.grid = grid;
            this.originalContent = grid.innerHTML;
            this.baseCount = grid.children.length;
            this.isActive = false;
            if (this.resizeObserver) this.resizeObserver.disconnect();
            this.isDesktop = window.innerWidth > 768;
            this.rafId = null;

            // State definition
            this.isDown = false;
            this.isDragging = false;
            this.startPos = 0;
            this.scrollStart = 0;
            this.velocity = 0;
            this.prevMousePos = 0;
            this.prevTime = 0;
            this.exactScroll = 0;
            this.initialized = false;

            // Binders for events so we can remove them later
            this.onDragStart = (e) => e.preventDefault();
            this.onMouseDown = this.handleMouseDown.bind(this);
            this.onMouseLeave = this.handleMouseUpOrLeave.bind(this);
            this.onMouseUp = this.handleMouseUpOrLeave.bind(this);
            this.onMouseMove = this.handleMouseMove.bind(this);
            this.onWheel = this.handleWheel.bind(this);
            this.onClick = this.handleClick.bind(this);
            this.onTouchStart = this.handleTouchStart.bind(this);
            this.onTouchMove = this.handleTouchMove.bind(this);
            this.onTouchEnd = this.handleTouchEnd.bind(this);

            this.init();

            // Add ResizeObserver to dynamically update metrics if images load out of band
            this.resizeObserver = new ResizeObserver(() => {
                if (this.initialized) {
                    if (this.isDesktop) {
                        let newBound = this.boundSize;
                        const targetChild = this.grid.children[this.baseCount * 3];
                        if (targetChild && targetChild.offsetLeft > 0) {
                            newBound = targetChild.offsetLeft;
                        } else {
                            newBound = this.grid.scrollWidth / 5;
                        }
                        if (newBound > 0 && Math.abs(this.boundSize - newBound) > 2) {
                            const factor = this.exactScroll / this.boundSize;
                            this.boundSize = newBound;
                            this.exactScroll = factor * this.boundSize;
                            this.grid.scrollLeft = this.exactScroll;
                            this.scrollStart = this.exactScroll;
                        }
                    } else {
                        const targetNode = this.grid.children[this.mobileBlockItems];
                        if (targetNode) {
                            this.boundSize = targetNode.offsetTop - 3;
                        }
                    }
                }
            });
            this.resizeObserver.observe(this.grid);
        }

        init() {
            const currentIsDesktop = window.innerWidth > 768;

            if (this.isActive && this.isDesktop === currentIsDesktop) return; // Mode hasn't changed

            this.destroy(); // Clean up if mode changed
            this.isDesktop = currentIsDesktop;
            this.isActive = true;

            if (this.isDesktop) {
                this.initDesktop();
            } else {
                this.initMobile();
            }

            this.grid.addEventListener('dragstart', this.onDragStart);
            this.grid.addEventListener('click', this.onClick, true);

            // Mouse events
            this.grid.addEventListener('mousedown', this.onMouseDown);
            this.grid.addEventListener('mouseleave', this.onMouseLeave);
            this.grid.addEventListener('mouseup', this.onMouseUp);
            this.grid.addEventListener('mousemove', this.onMouseMove);
            this.grid.addEventListener('wheel', this.onWheel, { passive: false });

            // Touch events for drag physics
            this.grid.addEventListener('touchstart', this.onTouchStart, { passive: false });
            this.grid.addEventListener('touchmove', this.onTouchMove, { passive: false });
            this.grid.addEventListener('touchend', this.onTouchEnd);

            setTimeout(() => {
                // GLightbox is now managed as a singleton globally in myscript.js

                // Wait for images to load before fading in to avoid grey rectangle flashes
                const images = this.grid.querySelectorAll('img');
                let imagesLoaded = 0;
                let hasLoaded = false;

                const finalizeGrid = () => {
                    if (hasLoaded) return;
                    hasLoaded = true;
                    setTimeout(() => {
                        this.grid.classList.add('grid-loaded');
                    }, 50);
                };

                if (images.length === 0) {
                    finalizeGrid();
                } else {
                    images.forEach(img => {
                        if (img.complete) {
                            imagesLoaded++;
                        } else {
                            img.addEventListener('load', () => {
                                imagesLoaded++;
                                if (imagesLoaded === images.length) finalizeGrid();
                            }, { once: true });
                            img.addEventListener('error', () => {
                                imagesLoaded++;
                                if (imagesLoaded === images.length) finalizeGrid();
                            }, { once: true });
                        }
                    });

                    if (imagesLoaded === images.length) {
                        finalizeGrid();
                    } else {
                        setTimeout(finalizeGrid, 800); // 800ms failsafe
                    }
                }
            }, 200);
        }

        destroy() {
            this.isActive = false;
            if (this.rafId) cancelAnimationFrame(this.rafId);
            this.grid.innerHTML = this.originalContent; // Remove clones

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
        }

        // --- DESKTOP LOGIC (Horizontal Grid Math Alignment) ---
        initDesktop() {
            // The CSS grid relies on an `nth-child(3n+1)` pattern.
            // If the original item count is not divisible by 3, cloning it breaks the physical layout sync.
            // By repeating the base content exactly 3 times, we mathematically guarantee the item count is a multiple of 3!
            const perfectBlock = this.originalContent.repeat(3);

            // Now repeat this geometrically perfect block 5 times to create a massive scroll runway
            this.grid.innerHTML = perfectBlock.repeat(5);
            this.boundSize = 0;
            this.initialized = false;

            setTimeout(() => {
                this.tryInitDesktopGeometry();
                this.loopDesktop();
            }, 100);
        }

        tryInitDesktopGeometry() {
            if (this.boundSize === 0 && this.grid.children.length > this.baseCount) {
                // The exact physical pixel width of one perfect geometry block
                const targetChild = this.grid.children[this.baseCount * 3]; // 3 repeats = 1 perfect block
                if (targetChild && targetChild.offsetLeft > 0) {
                    this.boundSize = targetChild.offsetLeft;
                    this.grid.scrollLeft = this.boundSize * 2;
                    this.exactScroll = this.grid.scrollLeft;
                    this.scrollStart = this.exactScroll;
                    this.initialized = true;
                } else if (this.grid.scrollWidth > 0) {
                    // Fallback
                    this.boundSize = this.grid.scrollWidth / 5;
                    this.grid.scrollLeft = this.boundSize * 2;
                    this.exactScroll = this.grid.scrollLeft;
                    this.scrollStart = this.exactScroll;
                    this.initialized = true;
                }
            }
        }

        loopDesktop() {
            if (!this.isActive) return;

            // Lazy init if tab was hidden on load
            if (!this.initialized) {
                this.tryInitDesktopGeometry();
            }

            if (!this.isDown) {
                if (Math.abs(this.velocity) > 0.1) {
                    this.velocity *= 0.98;
                    this.exactScroll -= this.velocity;
                    this.grid.scrollLeft = this.exactScroll;
                } else {
                    this.velocity = 0;
                }
            }

            // Keep the user bouncing invisibly around the middle to avoid maxScroll physically
            if (this.initialized && this.boundSize > 0) {
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

        // --- MOBILE LOGIC (Vertical Blocks) ---
        initMobile() {
            const itemsCount = this.grid.querySelectorAll('a').length;
            if (itemsCount === 0) return;

            // To maintain CSS nth-child(5n) patterns seamlessly during vertical loops (e.g., in arts.html),
            // the total repeats of the content block MUST be a multiple of 5. 
            // We also ensure there's a minimum pool of ~40 items so small galleries (1-3 images) 
            // have enough physical height to scroll vertically without hitting the edges.

            let minItems = Math.max(40, itemsCount * 5);
            let repeats = Math.ceil(minItems / itemsCount);
            while (repeats % 5 !== 0) {
                repeats++;
            }

            this.mobileBlockItems = itemsCount * repeats;

            const blockContent = this.originalContent.repeat(repeats);

            this.grid.innerHTML = blockContent + blockContent;
            this.initialized = false;
            this.boundSize = 0;

            setTimeout(() => this.loopMobile(), 100);
        }

        loopMobile() {
            if (!this.isActive) return;

            // Init geometry on first frame it becomes visible (tab switch)
            // We only want teleporting to occur when nearing edges to maintain infinite behavior natively.
            if (!this.initialized && this.grid.scrollHeight > 0) {
                const targetNode = this.grid.children[this.mobileBlockItems];
                if (targetNode) {
                    this.boundSize = targetNode.offsetTop - 3;
                    this.grid.scrollTop = this.boundSize;
                    this.initialized = true;
                }
            }

            if (this.initialized && this.boundSize > 0) {
                const currentScroll = this.grid.scrollTop;

                // Let Native OS handle velocity and momentum, only explicitly jump if we hit limits
                if (currentScroll < this.boundSize * 0.2) {
                    this.grid.scrollTop = currentScroll + this.boundSize;
                } else if (currentScroll > this.boundSize * 1.5) {
                    this.grid.scrollTop = currentScroll - this.boundSize;
                }
            }

            this.rafId = requestAnimationFrame(() => this.loopMobile());
        }

        // --- EVENT HANDLERS (Axis Aware) ---
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

            // Temporarily grab scroll physics manually to stop any ongoing momentum
            if (this.isDesktop) {
                this.grid.style.scrollBehavior = 'auto';
            }
        }

        handleMouseDown(e) {
            if (document.body.classList.contains('glightbox-open')) return;
            const pos = this.isDesktop ? e.pageX - this.grid.offsetLeft : e.pageY - this.grid.offsetTop;
            this.startInteraction(pos);
        }

        handleTouchStart(e) {
            if (document.body.classList.contains('glightbox-open')) return;
            // Mobile works best with native scrolling, skip manual touch physics there to avoid conflict
            if (!this.isDesktop) return;

            const touch = e.touches[0];
            const pos = touch.pageX - this.grid.offsetLeft;
            this.startInteraction(pos);
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

            if (this.isDesktop) {
                this.grid.scrollLeft = this.exactScroll;
            }

            const now = Date.now();
            const dt = now - this.prevTime;
            if (dt > 0) {
                this.velocity = ((pos - this.prevMousePos) / dt) * 2.4;
            }
            this.prevTime = now;
            this.prevMousePos = pos;
        }

        handleMouseMove(e) {
            if (!this.isDown) return;
            const pos = this.isDesktop ? e.pageX - this.grid.offsetLeft : e.pageY - this.grid.offsetTop;
            this.moveInteraction(pos, () => e.preventDefault());
        }

        handleTouchMove(e) {
            if (!this.isDesktop || !this.isDown) return;
            const touch = e.touches[0];
            const pos = touch.pageX - this.grid.offsetLeft;
            this.moveInteraction(pos, () => {
                if (Math.abs(touch.pageX - this.startPos) > Math.abs(touch.pageY - this.startPos)) e.preventDefault();
            });
        }

        handleWheel(e) {
            // For mobile native scrolling, we don't interfere
            if (!this.isDesktop) return;

            if (e.deltaY !== 0) {
                e.preventDefault();
                this.velocity += (e.deltaY * 0.036);
            }
        }
    }

    const gridInstances = [];
    grids.forEach(grid => {
        gridInstances.push(new InfiniteGrid(grid));
    });

    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            gridInstances.forEach(instance => instance.init());
        }, 250);
    });

    // Bottom Slider Continuous Autoplay Clone Approach
    const bottomTrack = document.getElementById('bottom-track');
    if (bottomTrack) {
        bottomTrack.addEventListener('dragstart', (e) => e.preventDefault());

        const originalBottomHTML = bottomTrack.innerHTML;
        bottomTrack.innerHTML = originalBottomHTML + originalBottomHTML; // Double items

        // Wait for layout calculation and image load
        setTimeout(() => {
            if (typeof GLightbox !== 'undefined') {
                GLightbox({
                    selector: '.glightbox',
                    touchNavigation: true,
                    dragToleranceX: 40,
                    dragToleranceY: 150,
                    dragAutoSnap: true,
                    zoomable: true,
                    draggable: true
                });
            }

            // Force browser to calculate width AFTER cloned images render
            const images = bottomTrack.querySelectorAll('img');
            let imagesLoaded = 0;

            const initializeSlider = () => {
                const halfScrollWidth = bottomTrack.scrollWidth / 2;
                bottomTrack.scrollLeft = halfScrollWidth; // Start in middle

                // Bottom Slider Interaction State
                let isDown = false;
                let isDragging = false;
                let startX;
                let scrollLeftStart;
                let velocity = 0;
                let prevMouseX = 0;
                let prevTime = 0;

                let exactScrollLeft = bottomTrack.scrollLeft;

                // Unified Momentum + Autoplay Loop
                const momentumLoop = () => {
                    // ALWAYS apply constant baseline flow (conveyor belt)
                    if (!isDown) { // Only drift if NOT holding it, otherwise it fights the user's cursor
                        exactScrollLeft += 0.25;
                    }

                    if (!isDown) {
                        if (Math.abs(velocity) > 0.1) {
                            // Fling Momentum Physics
                            velocity *= 0.98;
                            exactScrollLeft -= velocity;
                            bottomTrack.scrollLeft = exactScrollLeft;
                        } else {
                            velocity = 0;
                            bottomTrack.scrollLeft = exactScrollLeft; // Apply drift
                        }
                    }

                    // Teleport Logic (Seamless Loop)
                    const maxScroll = bottomTrack.scrollWidth - bottomTrack.clientWidth;

                    if (exactScrollLeft <= 0) {
                        exactScrollLeft += halfScrollWidth;
                        bottomTrack.scrollLeft = exactScrollLeft;
                        scrollLeftStart += halfScrollWidth;
                    } else if (exactScrollLeft >= maxScroll - 5) {
                        exactScrollLeft -= halfScrollWidth;
                        bottomTrack.scrollLeft = exactScrollLeft;
                        scrollLeftStart -= halfScrollWidth;
                    }

                    requestAnimationFrame(momentumLoop);
                };
                requestAnimationFrame(momentumLoop);

                bottomTrack.addEventListener('click', (e) => {
                    if (isDragging) {
                        e.preventDefault();
                        e.stopPropagation();
                    }
                }, true);

                bottomTrack.addEventListener('mousedown', (e) => {
                    isDown = true;
                    isDragging = false;
                    bottomTrack.style.cursor = 'grabbing';
                    startX = e.pageX - bottomTrack.offsetLeft;
                    scrollLeftStart = exactScrollLeft;
                    velocity = 0;
                    prevMouseX = startX;
                    prevTime = Date.now();
                });

                bottomTrack.addEventListener('mouseleave', () => {
                    isDown = false;
                    bottomTrack.style.cursor = 'pointer';
                    if (Date.now() - prevTime > 50) velocity = 0;
                });

                bottomTrack.addEventListener('mouseup', () => {
                    isDown = false;
                    bottomTrack.style.cursor = 'pointer';
                    if (Date.now() - prevTime > 50) velocity = 0;
                });

                bottomTrack.addEventListener('mousemove', (e) => {
                    if (!isDown) return;
                    e.preventDefault();
                    const x = e.pageX - bottomTrack.offsetLeft;
                    const walk = (x - startX) * 2;

                    if (Math.abs(walk) > 5) isDragging = true;

                    exactScrollLeft = scrollLeftStart - walk;
                    bottomTrack.scrollLeft = exactScrollLeft;

                    let now = Date.now();
                    let dt = now - prevTime;
                    if (dt > 0) {
                        velocity = ((x - prevMouseX) / dt) * 3.6;
                    }
                    prevTime = now;
                    prevMouseX = x;
                });

                bottomTrack.addEventListener('wheel', (e) => {
                    if (e.deltaY !== 0) {
                        e.preventDefault();
                        velocity += (e.deltaY * 0.036);
                    }
                }, { passive: false });

                // Add fade-in class securely AFTER math is initialized and images are loaded
                setTimeout(() => {
                    bottomTrack.classList.add('grid-loaded');
                }, 50);

            }; // End initializeSlider

            images.forEach(img => {
                if (img.complete) {
                    imagesLoaded++;
                } else {
                    img.addEventListener('load', () => {
                        imagesLoaded++;
                        if (imagesLoaded === images.length) initializeSlider();
                    }, { once: true });
                    img.addEventListener('error', () => {
                        imagesLoaded++;
                        if (imagesLoaded === images.length) initializeSlider();
                    }, { once: true });
                }
            });

            if (imagesLoaded === images.length) {
                initializeSlider();
            } else {
                // Wait up to 800ms for images to load, otherwise force initialize (failsafe)
                setTimeout(() => {
                    if (!bottomTrack.classList.contains('grid-loaded')) {
                        initializeSlider();
                    }
                }, 800);
            }

        }, 100);
    }
};

// Boot on initial page load
document.addEventListener('DOMContentLoaded', window.initGalleryEngine);

// Re-boot on every PJAX navigation. Destroy all existing InfiniteGrid instances
// before creating new ones to prevent event listener leaks.
window.addEventListener('pjax:complete', function () {
    // Clean up any old grid instances by destroying them
    if (window._gridInstances) {
        window._gridInstances.forEach(function (inst) {
            try { inst.destroy(); } catch (e) { }
        });
    }
    window._gridInstances = [];
    // Use rAF so gallery measure runs after the browser has painted the new content
    requestAnimationFrame(function () {
        window.initGalleryEngine();
    });
});
