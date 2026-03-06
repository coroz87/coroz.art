var fixed_menu = true;
window.jQuery = window.$ = jQuery;


/*-----------------------------------------------------------------------------------*/
/*	PRELOADER
/*-----------------------------------------------------------------------------------*/
window.addEventListener('load', function () {
	// Preloader hide
	setTimeout(function () {
		jQuery('#preloader').animate({ 'opacity': '0' }, 300, function () { jQuery('#preloader').hide(); });
	}, 800);
	setTimeout(function () { jQuery('.preloader_hide, .selector_open').animate({ 'opacity': '1' }, 500); }, 800);
	setTimeout(function () { jQuery('footer').animate({ 'opacity': '1' }, 500); }, 2000);

	// Mark page as entering for the CSS fade-in animation ONLY after all images have fully loaded.
	// This prevents masonry galleries from "jumping" as they establish dimensions.
	document.body.classList.add('page-entering');
});

// Safari Cache Fix (bfcache): When users press the browser's "Back" button, Safari loads the 
// exact frozen DOM state from memory. If the page was frozen in a "faded out" state during 
// departure, it stays invisible. This forces Safari to un-fade the page on return.
window.addEventListener('pageshow', function (e) {
	if (e.persisted) {
		document.body.classList.remove('page-leaving');
	}
});



/*-----------------------------------------------------------------------------------*/
/*	PAGE TRANSITIONS + NAVIGATION ROUTER
/*-----------------------------------------------------------------------------------*/
document.addEventListener('DOMContentLoaded', function () {

	// --- DARK MODE THEME LOGIC ---
	// 1. Check local storage on load
	const savedTheme = localStorage.getItem('coroz_theme');
	if (savedTheme === 'dark') {
		document.body.classList.add('dark-mode');

		// Prevent the toggle from animating when first loading the page in dark mode
		const noTransitionStyle = document.createElement('style');
		noTransitionStyle.innerHTML = '.theme-switch .slider:before, .theme-switch .slider { transition: none !important; }';
		document.head.appendChild(noTransitionStyle);

		// Set the toggle switch to checked if we're in dark mode
		const themeSwitches = document.querySelectorAll('.theme-switch input');
		themeSwitches.forEach(sw => sw.checked = true);

		// Force the browser to reflow and apply the instantaneous position
		void document.body.offsetHeight;

		// Re-enable normal animations
		setTimeout(() => {
			noTransitionStyle.remove();
		}, 50);
	}

	// 2. Listen for clicks on the theme switch
	document.body.addEventListener('change', function (e) {
		if (e.target.matches('.theme-switch input')) {
			// Toggle dark mode class on body
			if (e.target.checked) {
				document.body.classList.add('dark-mode');
				localStorage.setItem('coroz_theme', 'dark');
			} else {
				document.body.classList.remove('dark-mode');
				localStorage.setItem('coroz_theme', 'light');
			}

			// Keep all switches (e.g. if multiple exist) in sync
			document.querySelectorAll('.theme-switch input').forEach(sw => {
				sw.checked = e.target.checked;
			});
		}
	});

	/*-----------------------------------------------------------------------------------*/
	/*	NAVIGATION ROUTER
	/*  Strategy: fade out → real browser navigation. 100% reliable (same as refresh).
	/*  The header is position:fixed so it never visually jumps between pages.
	/*  Same-page hash links (e.g. #illustrations) switch tabs directly with no reload.
	/*-----------------------------------------------------------------------------------*/


	function navigateTo(dest) {
		// Fade out, then redirect (reliable as a browser refresh)
		document.body.classList.remove('page-entering');
		document.body.classList.add('page-leaving');

		setTimeout(function () {
			var currentUrlNoHash = window.location.href.split('#')[0];
			var destUrlNoHash = dest.split('#')[0];
			var isSamePage = (currentUrlNoHash === destUrlNoHash);

			// On file:// (local preview) browsers won't auto-resolve directory/ → directory/index.html
			if (window.location.protocol === 'file:') {
				var parts = dest.split('#');
				var base = parts[0];
				var hash = parts.length > 1 ? '#' + parts.slice(1).join('#') : '';
				if (base.endsWith('/') || !base.split('/').pop().includes('.')) {
					if (!base.endsWith('/')) base += '/';
					base += 'index.html';
				}
				window.location.href = base + hash;
			} else {
				window.location.href = dest;
			}

			// If the user navigates directly to the exact same pathname they are already on, 
			// the browser avoids a full page load. To meet the requirement of natively resetting
			// the gallery and acting like a "refresh", we force a hard reload here!
			if (isSamePage) {
				window.location.reload();
			}
		}, 350); // matches the CSS leave animation duration
	}

	// Intercept all internal nav link clicks
	document.body.addEventListener('click', function (e) {
		if (document.body.classList.contains('glightbox-open')) return;
		var link = e.target.closest('a[href]');
		if (!link) return;

		var href = link.getAttribute('href');
		// Ignore non-navigating links
		if (!href || href.startsWith('javascript') || href.startsWith('mailto') || href.startsWith('tel')) return;
		if (link.target === '_blank') return;

		// Ignore pure in-page anchor links (bare #hash with no path)
		if (href.startsWith('#')) return;

		// Ignore external links
		var destUrl;
		try {
			destUrl = new URL(href, window.location.href);
			if (destUrl.hostname !== window.location.hostname) return;
			if (destUrl.protocol !== window.location.protocol) return;
		} catch (ex) { return; }

		// If user clicks the exact menu item they are already on, force a full refresh sequence
		if (destUrl.pathname === window.location.pathname && destUrl.hash === window.location.hash) {
			e.preventDefault();
			navigateTo(link.href);
			return;
		}

		// Same-page hash-only change (same path, different hash) — switch tab directly
		if (destUrl.pathname === window.location.pathname && destUrl.hash) {
			e.preventDefault();
			var hashId = destUrl.hash.slice(1);
			var tabBtn = document.querySelector('[data-target="gallery-' + hashId + '"]');
			if (tabBtn) tabBtn.click();
			history.pushState(null, '', href);
			return;
		}

		// Full page navigation — fade out then redirect
		e.preventDefault();
		navigateTo(link.href);
	});

	// Handle browser back/forward (popstate) — just navigate normally, browser handles it
	window.addEventListener('popstate', function () {
		window.location.reload();
	});





	/* Coroz Master Script Initializer */
	window.initCorozScripts = function () {
		/* Superfish */
		if ($(window).width() >= 992) {
			$('.navmenu ul').superfish();
		}

		// Forcibly close any dropdowns that may have stayed open across PJAX navigations (desktop only)
		if ($(window).width() >= 992) {
			$('.navmenu ul li').removeClass('sfHover');
			$('.navmenu ul ul').css('display', 'none');
		} else {
			// On mobile, ensure inline styles don't override the style.css native layout
			$('.navmenu ul ul').css('display', '');
		}

		// Close mobile menu on navigation (desktop nav always stays visible)
		if ($(window).width() < 992) {
			$('.navmenu').slideUp(0);
		} else {
			$('.navmenu').css('display', ''); // ensure desktop nav is always visible
		}

		// Mobile Menu Toggler
		$('.menu_toggler').off('click').on('click', function () {
			$('.navmenu').slideToggle();
		});

		// Auto-close mobile menu when any nav link is tapped
		$(document).off('click', '.navmenu a').on('click', '.navmenu a', function () {
			if ($(window).width() < 992) {
				$('.navmenu').slideUp(200);
			}
		});

		// Auto-close mobile menu when the dark/light toggle is used
		$(document).off('change', '.navmenu .theme-switch input').on('change', '.navmenu .theme-switch input', function () {
			if ($(window).width() < 992) {
				setTimeout(function () { $('.navmenu').slideUp(200); }, 300); // tiny delay so toggle visually registers first
			}
		});

		// Re-bind window resize
		$(window).off('resize.corozNav').on('resize.corozNav', function () {
			if ($(window).width() > 991) {
				$('.navmenu').css('display', '');
			}
		});

		/*-----------------------------------------------------------------------------------*/
		/*	FLEXSLIDER
		/*-----------------------------------------------------------------------------------*/
		try {
			// Clean up existing instances before re-init if PJAX fired
			if ($('.flexslider.top_slider').length && $('.flexslider.top_slider').data('flexslider')) {
				$('.flexslider.top_slider').flexslider('destroy');
			}
			//Top Slider
			$('.flexslider.top_slider').flexslider({
				animation: "fade",
				controlNav: true,
				directionNav: false,
				animationLoop: true,
				slideshow: true,
				slideshowSpeed: 6000, /* Start at 6s for the first slide */
				animationSpeed: 1500,
				pauseOnAction: false,
				useCSS: true,
				prevText: "",
				nextText: "",
				before: function (slider) {
					var masterBtn = document.getElementById('master_slide_btn');
					if (!masterBtn) return;

					var nextSlide = slider.animatingTo;

					// Slide 0 (Arts & Design): No button, fade it out instantly
					if (nextSlide === 0) {
						masterBtn.style.transition = 'opacity 0.5s ease';
						masterBtn.style.opacity = '0';
						masterBtn.style.pointerEvents = 'none';
					}
					// Slide 1 (2D): Fade in slowly AFTER all text is done (2.0s delay)
					else if (nextSlide === 1) {
						masterBtn.href = '../2dprojects/';
						masterBtn.style.transition = 'opacity 2.0s ease 2.0s';
						masterBtn.style.opacity = '1';
						masterBtn.style.pointerEvents = 'auto';
					}
					// Slide 2 (3D) & Slide 3 (Arts): Keep persistent, switch links instantly
					else if (nextSlide === 2 || nextSlide === 3) {
						masterBtn.href = (nextSlide === 2) ? '../3dprojects/' : '../arts/';
						masterBtn.style.transition = 'none'; // Don't fade out/in, stay solid during transition
						masterBtn.style.opacity = '1';
						masterBtn.style.pointerEvents = 'auto';
					}
				},
				after: function (slider) {
					// If we just transitioned TO slide 0 (the first slide), set the next wait to 6s.
					// Otherwise (slide 1, 2, or 3), set next wait to 7s.
					var speed = (slider.currentSlide === 0) ? 6000 : 7000;

					if (slider.vars.slideshowSpeed !== speed) {
						slider.vars.slideshowSpeed = speed;

						// Flexslider doesn't update its internal interval dynamically, so we must 
						// pause and play manually to lock in the new delay interval on the fly
						if (slider.playing) {
							slider.pause();
							slider.play();
						}
					}
				}
			});

			homeHeight();


			jQuery('.flexslider.top_slider .flex-direction-nav').addClass('container');


			//Vision Slider
			$('.flexslider.portfolio_single_slider').flexslider({
				animation: "fade",
				controlNav: true,
				directionNav: true,
				animationLoop: false,
				slideshow: false,
			});

			homeHeight();

			$(window).off('resize.corozHome').on('resize.corozHome', function () {
				homeHeight();
			});

			function homeHeight() {
				var wh = jQuery(window).height() - 60;
				jQuery('.top_slider, .top_slider .slides li').css('height', wh);
				jQuery('#home').css('height', wh);
			}
		} catch (e) { console.warn("FlexSlider Init Warning:", e); }









		/*-----------------------------------------------------------------------------------*/
		/*	BLACK AND WHITE
		/*-----------------------------------------------------------------------------------*/
		try {
			if ($('.client_img').length && $.fn.BlackAndWhite) {
				$('.client_img').BlackAndWhite({
					hoverEffect: true,
					webworkerPath: false,
					responsive: true,
					invertHoverEffect: false,
					intensity: 1,
					speed: {
						fadeIn: 200,
						fadeOut: 800
					}
				});
			}
		} catch (e) { console.warn("BlackAndWhite Init Warning:", e); }


		/*-----------------------------------------------------------------------------------*/
		/*	IFRAME TRANSPARENT
		/*-----------------------------------------------------------------------------------*/
		$("iframe").each(function () {
			var ifr_source = $(this).attr('src');
			var wmode = "wmode=transparent";
			if (ifr_source && ifr_source.indexOf('?') != -1) {
				var getQString = ifr_source.split('?');
				var oldString = getQString[1];
				var newString = getQString[0];
				$(this).attr('src', newString + '?' + wmode + '&' + oldString);
			}
			else if (ifr_source) $(this).attr('src', ifr_source + '?' + wmode);
		});

		/*-----------------------------------------------------------------------------------*/
		/*	BLOG MIN HEIGHT
		/*-----------------------------------------------------------------------------------*/
		blogHeight();

		/*-----------------------------------------------------------------------------------*/
		/*	FOOTER HEIGHT
		/*-----------------------------------------------------------------------------------*/
		contactHeight();

		/*-----------------------------------------------------------------------------------*/
		/*	FOOTER MAP
		/*-----------------------------------------------------------------------------------*/
		// Kept blank. Map events are delegated for PJAX safety further down.

		/*-----------------------------------------------------------------------------------*/
		/*	MAGNIFIC POPUP / GLIGHTBOX
		/*-----------------------------------------------------------------------------------*/
		// Destroy any existing glightbox instances left over from previous page to prevent duplicate overlays breaking swipes
		if (window.corozLightbox) {
			try { window.corozLightbox.destroy(); } catch (e) { }
		}
		window.corozLightbox = GLightbox({
			selector: '.glightbox, .zoom',
			touchNavigation: true,
			loop: true,
			autoplayVideos: true,
			dragToleranceX: 40,
			dragToleranceY: 150,
			zoomable: true,
			draggable: true,
			moreLength: 0 // 0 disables the "See more" truncation completely
		});

		// Native Mouse Wheel to switch Images within Lightbox (Globally applied to all GLightbox instances)
		window.addEventListener('wheel', (e) => {
			const lightboxContainer = document.querySelector('.glightbox-container');
			const bodyHasOpenClass = document.body.classList.contains('glightbox-open');

			// If the lightbox is open globally
			if (lightboxContainer && bodyHasOpenClass) {
				const nextBtn = document.querySelector('.gnext');
				const prevBtn = document.querySelector('.gprev');

				if (nextBtn && prevBtn) {
					e.preventDefault(); // Prevent page scroll

					// Add a small debounce buffer to prevent rapid fire skipping
					if (window.glightboxWheelTimer) return;

					window.glightboxWheelTimer = setTimeout(() => {
						window.glightboxWheelTimer = null;
					}, 300);

					if (e.deltaY > 0) {
						// Reverse for mobile: Scroll down (push up) -> Prev image 
						prevBtn.click();
					} else if (e.deltaY < 0) {
						// Scroll up (pull down) -> Next image
						nextBtn.click();
					}
				}
			}
		}, { passive: false });

		// Contact Form AJAX Submit (Delegated so it works on PJAX)
		$('#contact-form-face').off('submit').on('submit', function (e) {
			e.preventDefault();
			var form = $(this);
			$.ajax({
				url: "https://formsubmit.co/ajax/coroz.art@gmail.com",
				method: "POST",
				data: form.serialize(),
				dataType: "json",
				success: function (response) {
					$('#note').html('<div class="notification_ok">Thank you! Your message has been sent.</div>');
					form.trigger('reset');
				},
				error: function (err) {
					$('#note').html('<div class="notification_error">There was an error sending your message. Please try again later.</div>');
				}
			});
		});






		/*-----------------------------------------------------------------------------------*/
		/*	SWIPER SLIDERS
		/*-----------------------------------------------------------------------------------*/
		try {
			const sliders = document.querySelectorAll('.team_slider, .news_slider');

			sliders.forEach(function (slider) {
				// Prevent double-init
				if (slider.swiper) slider.swiper.destroy(true, true);

				const swiper = new Swiper(slider, {
					loop: true,
					slidesPerView: "auto",
					spaceBetween: 0,
					speed: 8000,
					allowTouchMove: true,
					grabCursor: true,
					loopedSlides: 15, // Provide massive amount of cloned slides so rapid reverse dragging/scrolling never hits the edge
					autoplay: {
						delay: 0,
						disableOnInteraction: false,
					},
					on: {
						init: function () {
							// Add loaded class to trigger CSS fade-in
							this.el.classList.add('loaded');
						}
					}
				});

				// Force linear motion
				swiper.wrapperEl.style.transitionTimingFunction = 'linear';

				// Custom Mouse Wheel Navigation (Reversed natural scroll to match gallery)
				slider.addEventListener('wheel', (e) => {
					if (e.deltaY !== 0) {
						e.preventDefault();

						// Momentarily pause the autoplay animation to allow manual scroll
						swiper.autoplay.stop();

						// To move seamlessly in reverse while respecting Swiper's internal loop bounds:
						swiper.setTransition(0);
						// Minus deltaY reverses the scroll input direction
						swiper.setTranslate(swiper.getTranslate() - e.deltaY);

						// Force Swiper to recalculate loop boundaries if we scroll outside them
						if (swiper.isBeginning || swiper.isEnd) {
							swiper.loopFix();
						}

						// Re-engage auto-play motion fluidly after manual wheel
						clearTimeout(slider.wheelTimeout);
						slider.wheelTimeout = setTimeout(() => {
							// We must calculate the remaining distance of the current slide to resume the exact speed linear animation
							let resumeSpeed = swiper.params.speed;
							try {
								const translate = Math.abs(swiper.getTranslate());
								const slideWidth = (swiper.slides && swiper.slides.length > 0)
									? swiper.slides[0].offsetWidth
									: (swiper.width / swiper.params.slidesPerView);

								if (slideWidth > 0) {
									const remainingDistance = slideWidth - (translate % slideWidth);
									resumeSpeed = (remainingDistance / slideWidth) * swiper.params.speed;
								}
							} catch (mathErr) { }

							swiper.setTransition(resumeSpeed);
							swiper.slideNext(resumeSpeed);
							swiper.autoplay.start();
						}, 100);
					}
				}, { passive: false });

				// Listen to touch/drag events to also resume autoplay correctly instead of it stalling
				swiper.on('touchEnd', () => {
					swiper.autoplay.stop();
					setTimeout(() => {
						let resumeSpeed = swiper.params.speed;
						try {
							const translate = Math.abs(swiper.getTranslate());
							const slideWidth = (swiper.slides && swiper.slides.length > 0)
								? swiper.slides[0].offsetWidth
								: (swiper.width / swiper.params.slidesPerView);

							if (slideWidth > 0) {
								const remainingDistance = slideWidth - (translate % slideWidth);
								resumeSpeed = (remainingDistance / slideWidth) * swiper.params.speed;
							}
						} catch (mathErr) { }

						swiper.setTransition(resumeSpeed);
						swiper.slideNext(resumeSpeed);
						swiper.autoplay.start();
					}, 100);
				});
			});
		} catch (e) {
			console.warn("Swiper Init Warning:", e);
		}

	} // <-- END of window.initCorozScripts = function()

	/*-----------------------------------------------------------------------------------*/
	/*	HEADER SCROLL NAVIGATION (Runs ONCE per session because header is persistent)
	/*-----------------------------------------------------------------------------------*/
	const pages = [
		'home',
		'2dprojects',
		'3dprojects',
		'arts',
		'contact'
	];

	const headerSelector = document.querySelector('.menu_block');
	if (headerSelector) {
		let isNavigating = false;
		headerSelector.addEventListener('wheel', function (e) {
			if (isNavigating) return;

			// Get the current section name from the URL path
			let pathParts = window.location.pathname.split('/').filter(p => p !== '');
			let currentSection = pathParts[pathParts.length - 1] || 'home';

			// Detect if we are in index.html and if it shifted the path
			if (currentSection === 'index.html') {
				currentSection = pathParts[pathParts.length - 2] || 'home';
			}

			let currentIndex = pages.indexOf(currentSection);
			if (currentIndex === -1) currentIndex = 0; // Fallback to home

			let targetIndex = currentIndex;
			if (e.deltaY > 0) {
				targetIndex = (currentIndex - 1 + pages.length) % pages.length;
			} else if (e.deltaY < 0) {
				targetIndex = (currentIndex + 1) % pages.length;
			}

			if (targetIndex !== currentIndex) {
				e.preventDefault();
				isNavigating = true;

				document.body.classList.add('page-leaving');
				setTimeout(function () {
					let suffix = window.location.protocol === 'file:' ? 'index.html' : '';
					// Allow re-navigation after transition duration
					setTimeout(() => { isNavigating = false; }, 1000);

					// Ensure smooth transition regardless of pushState
					let targetUrl = '../' + pages[targetIndex] + '/' + suffix;
					// Dispatch click to trigger our robust PJAX interceptor instead of hard redirect
					let tempLink = document.createElement('a');
					tempLink.href = targetUrl;
					document.body.appendChild(tempLink);
					tempLink.click();
					tempLink.remove();
				}, 400);
			}
		}, { passive: false });
	}


	// === BIND MASTER SCRIPT INITIALIZER ===
	// Fire on initial page load (scripts re-run after every real browser navigation)
	if (window.initCorozScripts) {
		window.initCorozScripts();
	}

}); // end DOMContentLoaded

