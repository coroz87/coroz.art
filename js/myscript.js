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
/*	PAGE TRANSITIONS
/*-----------------------------------------------------------------------------------*/
document.addEventListener('DOMContentLoaded', function () {
	// Trigger enter animation
	document.body.classList.add('page-entering');

	// Intercept nav links for page-leave animation
	document.querySelectorAll('.navmenu a[href], .logo a, .slide_btn').forEach(function (link) {
		// Only intercept same-origin .html links (not # anchors, not external)
		var href = link.getAttribute('href');
		if (!href || href.startsWith('#') || href.startsWith('javascript')) return;
		if (link.hostname && link.hostname !== window.location.hostname) return;

		link.addEventListener('click', function (e) {
			var dest = this.href;
			// Don't animate if already on this page
			if (dest === window.location.href) return;
			e.preventDefault();
			document.body.classList.add('page-leaving');
			setTimeout(function () {
				let finalDest = dest;
				// If local file browsing and pointing to a directory, append index.html
				if (window.location.protocol === 'file:' && (dest.endsWith('/') || !dest.split('/').pop().includes('.'))) {
					if (!finalDest.endsWith('/')) finalDest += '/';
					finalDest += 'index.html';
				}
				window.location.href = finalDest;
			}, 400);
		});
	});
});


/* Superfish */
jQuery(document).ready(function () {
	if ($(window).width() >= 992) {
		$('.navmenu ul').superfish();
	}

	// Mobile Menu Toggler
	$('.menu_toggler').click(function () {
		$('.navmenu').slideToggle();
	});
});

jQuery(window).resize(function () {
	if ($(window).width() > 991) {
		$('.navmenu').css('display', '');
	}
});

/*-----------------------------------------------------------------------------------*/
/*	FLEXSLIDER
/*-----------------------------------------------------------------------------------*/
jQuery(window).load(function () {
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


});

jQuery(window).resize(function () {
	homeHeight();

});

jQuery(document).ready(function () {
	homeHeight();

});

function homeHeight() {
	var wh = jQuery(window).height() - 60;
	jQuery('.top_slider, .top_slider .slides li').css('height', wh);
	jQuery('#home').css('height', wh);
}









/*-----------------------------------------------------------------------------------*/
/*	IFRAME TRANSPARENT
/*-----------------------------------------------------------------------------------*/
jQuery(document).ready(function () {
	$("iframe").each(function () {
		var ifr_source = $(this).attr('src');
		var wmode = "wmode=transparent";
		if (ifr_source.indexOf('?') != -1) {
			var getQString = ifr_source.split('?');
			var oldString = getQString[1];
			var newString = getQString[0];
			$(this).attr('src', newString + '?' + wmode + '&' + oldString);
		}
		else $(this).attr('src', ifr_source + '?' + wmode);
	});
});







/*-----------------------------------------------------------------------------------*/
/*	BLOG MIN HEIGHT
/*-----------------------------------------------------------------------------------*/
jQuery(document).ready(function () {
	blogHeight();
});

jQuery(window).resize(function () {
	blogHeight();
});

function blogHeight() {
	if ($(window).width() > 991) {
		var wh = jQuery(window).height() - 60;
		jQuery('#blog').css('min-height', wh);
	}

}







/*-----------------------------------------------------------------------------------*/
/*	FOOTER HEIGHT
/*-----------------------------------------------------------------------------------*/
jQuery(document).ready(function () {
	contactHeight();
});

jQuery(window).resize(function () {
	contactHeight();
});

function contactHeight() {
	if ($(window).width() > 991) {
		var wh = jQuery('footer').height() + 70;
		jQuery('#contacts').css('min-height', wh);
	}


}





/*-----------------------------------------------------------------------------------*/
/*	FOOTER MAP
/*-----------------------------------------------------------------------------------*/
jQuery(document).ready(function () {
	jQuery('.map_show').click(function () {
		jQuery('#map').addClass('showed');
	});

	jQuery('.map_hide').click(function () {
		jQuery('#map').removeClass('showed');
	});
});


/*-----------------------------------------------------------------------------------*/
/*  CONTACT FORM AJAX SUBMIT
/*-----------------------------------------------------------------------------------*/
$(document).ready(function () {

	$('#contact-form-face').on('submit', function (e) {
		e.preventDefault(); // prevent page reload

		var form = $(this);

		$.ajax({
			url: "https://formsubmit.co/ajax/coroz.art@gmail.com",
			method: "POST",
			data: form.serialize(),
			dataType: "json",
			success: function () {

				$('#note').html(
					'<div class="success_message">Thank you! Your message has been sent.</div>'
				).fadeIn();

				form.trigger("reset");

				setTimeout(function () {
					$('#note').fadeOut();
				}, 4000);
			},
			error: function () {
				$('#note').html(
					'<div class="notification_error">Oops! Something went wrong.</div>'
				).fadeIn();
			}
		});
	});

});




document.addEventListener('DOMContentLoaded', function () {
	if (typeof GLightbox === 'undefined') return;
	const lightbox = GLightbox({
		selector: '.glightbox',
		touchNavigation: true,
		loop: true,
		zoomable: true,
		draggable: true,
		dragAutoSnap: true,
		autoplayVideos: false,
		descriptionLength: 10000,
		descPosition: 'bottom'
	});

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








document.addEventListener('DOMContentLoaded', function () {

	const sliders = document.querySelectorAll('.team_slider, .news_slider');

	sliders.forEach(function (slider) {

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

});

/*-----------------------------------------------------------------------------------*/
/*	HEADER SCROLL NAVIGATION
/*-----------------------------------------------------------------------------------*/
document.addEventListener('DOMContentLoaded', function () {
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
					window.location.href = '../' + pages[targetIndex] + '/' + suffix;
				}, 400);
			}
		}, { passive: false });
	}
});



