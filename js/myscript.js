var fixed_menu = true;
window.jQuery = window.$ = jQuery;


/*-----------------------------------------------------------------------------------*/
/*	PRELOADER
/*-----------------------------------------------------------------------------------*/
jQuery(window).load(function () {
	//Preloader
	setTimeout("jQuery('#preloader').animate({'opacity' : '0'},300,function(){jQuery('#preloader').hide()})", 800);
	setTimeout("jQuery('.preloader_hide, .selector_open').animate({'opacity' : '1'},500)", 800);
	setTimeout("jQuery('footer').animate({'opacity' : '1'},500)", 2000);

});



/*-----------------------------------------------------------------------------------*/
/*	PAGE TRANSITIONS — PJAX Router
/*  On file:// (local preview): falls back to hard reload (Chrome blocks local fetch)
/*  On https:// (deployed):     fetches page silently, swaps content, keeps header alive
/*-----------------------------------------------------------------------------------*/
document.addEventListener('DOMContentLoaded', function () {
	// Mark page as entering for the CSS fade-in animation
	document.body.classList.add('page-entering');

	// Tag any original <style> blocks in the head so PJAX knows to clean them up
	document.querySelectorAll('head > style').forEach(function (s, i) {
		if (!s.id) s.id = 'pjax-original-style-' + i;
	});

	// --- DARK MODE THEME LOGIC ---
	// 1. Check local storage on load
	const savedTheme = localStorage.getItem('coroz_theme');
	if (savedTheme === 'dark') {
		document.body.classList.add('dark-mode');
		// Set the toggle switch to checked if we're in dark mode
		const themeSwitches = document.querySelectorAll('.theme-switch input');
		themeSwitches.forEach(sw => sw.checked = true);
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

	function getContentFromDoc(doc) {
		// Strictly target the unfailing pjax wrapper we added to all pages
		return doc.querySelector('#pjax-container');
	}

	function getBodyClassesFromDoc(doc) {
		// Extract inline style from body (e.g. background)
		var bodyEl = doc.querySelector('body');
		return bodyEl ? bodyEl.getAttribute('style') || '' : '';
	}

	function getInlineStylesFromDoc(doc) {
		// Extract page-specific inline <style> blocks from <head>
		var styles = doc.querySelectorAll('head style');
		var combined = '';
		styles.forEach(function (s) { combined += s.innerHTML; });
		return combined;
	}

	function navigateTo(dest, pushHistory) {
		document.body.classList.remove('page-entering');
		document.body.classList.add('page-leaving');

		// --- FILE PROTOCOL FALLBACK ---
		if (window.location.protocol === 'file:') {
			setTimeout(function () {
				var parts = dest.split('#');
				var baseUrl = parts[0];
				var hash = parts.length > 1 ? '#' + parts.slice(1).join('#') : '';
				if (baseUrl.endsWith('/') || !baseUrl.split('/').pop().includes('.')) {
					if (!baseUrl.endsWith('/')) baseUrl += '/';
					baseUrl += 'index.html';
				}
				window.location.href = baseUrl + hash;
			}, 400);
			return;
		}

		// --- PJAX FETCH (https:// only) ---
		fetch(dest, { credentials: 'same-origin' })
			.then(function (response) {
				if (!response.ok) throw new Error('Navigation fetch failed: ' + response.status);
				return response.text();
			})
			.then(function (html) {
				var parser = new DOMParser();
				var newDoc = parser.parseFromString(html, 'text/html');

				var newContent = getContentFromDoc(newDoc);
				var currentContent = getContentFromDoc(document);
				var newTitle = newDoc.title || document.title;
				var newBodyStyle = getBodyClassesFromDoc(newDoc);
				var newStyles = getInlineStylesFromDoc(newDoc);

				// Swap page title
				document.title = newTitle;

				// Swap body inline style (e.g. background image for contact page)
				var bodyEl = document.querySelector('body');
				if (newBodyStyle) {
					bodyEl.setAttribute('style', newBodyStyle);
				} else {
					bodyEl.removeAttribute('style');
				}

				// Swap per-page inline styles (replace existing pjax style tag)
				document.querySelectorAll('style[id^="pjax-page-style"], style[id^="pjax-original-style"]').forEach(function (s) {
					s.remove();
				});
				if (newStyles) {
					var styleTag = document.createElement('style');
					styleTag.id = 'pjax-page-style';
					styleTag.innerHTML = newStyles;
					document.head.appendChild(styleTag);
				}

				// Swap body content safely by replacing inner contents of the permanent container
				if (newContent && currentContent) {
					currentContent.innerHTML = newContent.innerHTML;
					// Crucial: scroll to top on new page load so fixed headers align correctly
					window.scrollTo(0, 0);
				}

				// Update history
				if (pushHistory) {
					history.pushState({ pjaxUrl: dest }, newTitle, dest);
				}

				// Update active nav item
				document.querySelectorAll('.navmenu li').forEach(function (li) {
					li.classList.remove('active');
				});
				document.querySelectorAll('.navmenu a').forEach(function (a) {
					// Match if the link path matches the current pathname
					try {
						var linkUrl = new URL(a.href, window.location.href);
						if (linkUrl.pathname !== '/' && window.location.pathname.startsWith(linkUrl.pathname)) {
							a.closest('li') && a.closest('li').classList.add('active');
						}
					} catch (e) { }
				});

				// Trigger page enter animation on new content
				document.body.classList.remove('page-leaving');
				document.body.classList.add('page-entering');

				// Wait for animation frames so the browser fully paints and lays out the new DOM
				requestAnimationFrame(function () {
					requestAnimationFrame(function () {
						setTimeout(function () {
							window.dispatchEvent(new Event('pjax:complete'));
							window.dispatchEvent(new Event('resize'));
						}, 50); // Small 50ms buffer ensures DOM insertion is finalized
					});
				});

				// Handle hash scroll after PJAX swap
				var hash = new URL(dest, window.location.href).hash;
				if (hash) {
					var target = document.querySelector(hash.replace('#', '[data-target="gallery-') + '"]')
						|| document.querySelector(hash);
					if (target && typeof target.click === 'function') {
						setTimeout(function () { target.click(); }, 100);
					}
				} else {
					window.scrollTo(0, 0);
				}
			})
			.catch(function (err) {
				// On any fetch error, fall back to hard redirect
				console.warn('PJAX fetch failed, falling back to hard redirect:', err);
				window.location.href = dest;
			});
	}

	// Expose PJAX navigation globally so other scripts (e.g. gallery-engine.js) can trigger it
	window.pjaxNavigate = navigateTo;

	// Intercept all nav clicks
	document.body.addEventListener('click', function (e) {
		if (document.body.classList.contains('glightbox-open')) return;
		var link = e.target.closest('a[href]');
		if (!link) return;

		var href = link.getAttribute('href');
		if (!href || href.startsWith('#') || href.startsWith('javascript') || href.startsWith('mailto') || href.startsWith('tel')) return;
		if (link.target === '_blank') return;

		// External link
		try {
			var linkUrl = new URL(href, window.location.href);
			if (linkUrl.hostname !== window.location.hostname) return;
			if (linkUrl.protocol !== window.location.protocol) return;
		} catch (e) { return; }

		var dest = link.href;
		if (dest === window.location.href) return;

		e.preventDefault();
		navigateTo(dest, true);
	});

	// Handle browser back/forward
	window.addEventListener('popstate', function (e) {
		if (e.state && e.state.pjaxUrl) {
			navigateTo(e.state.pjaxUrl, false);
		}
	});

	// Set initial history state
	history.replaceState({ pjaxUrl: window.location.href }, document.title, window.location.href);
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
	/*	IFRAME TRANSPARENT (video iframes only – skip Maps, etc.)
	/*-----------------------------------------------------------------------------------*/
	$("iframe").each(function () {
		var ifr_source = $(this).attr('src');
		// Only apply wmode trick to YouTube/Vimeo video embeds, NOT Maps or other iframes
		if (!ifr_source) return;
		if (ifr_source.indexOf('youtube') === -1 && ifr_source.indexOf('vimeo') === -1) return;
		var wmode = "wmode=transparent";
		if (ifr_source.indexOf('?') !== -1) {
			var parts = ifr_source.split('?');
			$(this).attr('src', parts[0] + '?' + wmode + '&' + parts[1]);
		} else {
			$(this).attr('src', ifr_source + '?' + wmode);
		}
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





	// Map Panel (Contact page) - using event delegation for PJAX safety
	$(document).off('click.mapShow').on('click.mapShow', '.map_show', function () {
		$('#map').addClass('showed');
	});
	$(document).off('click.mapHide').on('click.mapHide', '.map_hide', function () {
		$('#map').removeClass('showed');
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
// Fire on initial page load
document.addEventListener('DOMContentLoaded', function () {
	if (window.initCorozScripts) {
		window.initCorozScripts();
	}
});

// Fire strictly whenever PJAX finishes swapping the DOM payload
window.addEventListener('pjax:complete', function () {
	if (window.initCorozScripts) {
		window.initCorozScripts();
	}
});
