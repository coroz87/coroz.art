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
/*	MENU
/*-----------------------------------------------------------------------------------*/
function calculateScroll() {
	var contentTop = [];
	var contentBottom = [];
	var winTop = $(window).scrollTop();
	var rangeTop = 200;
	var rangeBottom = 500;
	$('.navmenu').find('.scroll_btn a').each(function () {
		contentTop.push($($(this).attr('href')).offset().top);
		contentBottom.push($($(this).attr('href')).offset().top + $($(this).attr('href')).height());
	})
	$.each(contentTop, function (i) {
		if (winTop > contentTop[i] - rangeTop && winTop < contentBottom[i] - rangeBottom) {
			$('.navmenu li.scroll_btn')
				.removeClass('active')
				.eq(i).addClass('active');
		}
	})
};

jQuery(document).ready(function () {
	//MobileMenu
	if ($(window).width() < 768) {
		jQuery('.menu_block .container').prepend('<a href="javascript:void(0)" class="menu_toggler"><span class="fa fa-align-justify"></span></a>');
		jQuery('header .navmenu').hide();
		jQuery('.menu_toggler, .navmenu ul li a').click(function () {
			jQuery('header .navmenu').slideToggle(300);
		});
	}

	// if single_page
	if (jQuery("#page").hasClass("single_page")) {
	}
	else {
		$(window).scroll(function (event) {
			calculateScroll();
		});

		$('.navmenu ul li a, .mobile_menu ul li a, .btn_down').click(function (e) {
			e.preventDefault();

			const target = document.querySelector(this.hash);
			if (!target) return;

			// Signal the scroll snap listener to ignore this programmatic scroll
			if (window.setSnapLock) window.setSnapLock(1500);

			// Calculate center position exactly like the snap logic
			const secTop = target.getBoundingClientRect().top + window.scrollY;
			const secMid = secTop + target.offsetHeight / 2;
			const targetY = Math.max(0, Math.round(secMid - window.innerHeight / 2));

			// Except #home - always snap home to the absolute top
			if (this.hash === '#home') {
				window.scrollTo({ top: 0, behavior: "smooth" });
			} else {
				window.scrollTo({ top: targetY, behavior: "smooth" });
			}
		});

	};
});


/* Superfish */
jQuery(document).ready(function () {
	if ($(window).width() >= 768) {
		$('.navmenu ul').superfish();
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
		slideshowSpeed: 5000,
		animationSpeed: 1500,
		pauseOnAction: false,
		useCSS: true,
		prevText: "",
		nextText: ""
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
	var wh = jQuery(window).height() - 80;
	jQuery('.top_slider, .top_slider .slides li').css('height', wh);
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
		var wh = jQuery(window).height() - 80;
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
	const lightbox = GLightbox({
		selector: '.glightbox',
		touchNavigation: true,
		loop: true,
		zoomable: true,
		autoplayVideos: false
	});
});








document.addEventListener('DOMContentLoaded', function () {

	const sliders = document.querySelectorAll('.team_slider, .projects_slider, .news_slider');

	sliders.forEach(function (slider) {

		const swiper = new Swiper(slider, {
			loop: true,
			slidesPerView: "auto",
			spaceBetween: 0,
			speed: 12000,
			allowTouchMove: true,
			grabCursor: true,
			autoplay: {
				delay: 0,
				disableOnInteraction: false,
			}
		});

		// Force linear motion
		swiper.wrapperEl.style.transitionTimingFunction = 'linear';

		// Immediate pause on hover
		slider.addEventListener('mouseenter', () => {
			swiper.autoplay.stop();
			const translate = swiper.getTranslate();
			swiper.setTransition(0);
			swiper.setTranslate(translate);
		});

		slider.addEventListener('mouseleave', () => {
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
			} catch (e) {
				console.log("Swiper math error:", e);
			}

			// Force a transition to the next slide using precisely the remaining time
			swiper.setTransition(resumeSpeed);
			swiper.slideNext(resumeSpeed);

			// Re-enable the continuous autoplay tracker
			swiper.autoplay.start();
		});

	});

});
/*-----------------------------------------------------------------------------------*/
/*	SCROLL SNAP
/*-----------------------------------------------------------------------------------*/
(function () {
	var snapTimeout = null;
	var isSnapping = false;
	var snapLockTimeout = null;
	var DEBOUNCE_MS = 150;
	var SNAP_DURATION = 700;

	// Gesture tracking
	var gestureStartY = -1;
	var SCROLL_THRESHOLD = 30; // Minimum pixels scrolled to trigger a section change

	window.setSnapLock = function (duration) {
		isSnapping = true;
		clearTimeout(snapLockTimeout);
		snapLockTimeout = setTimeout(function () {
			isSnapping = false;
			gestureStartY = -1;
		}, duration);
	};

	function getSections() {
		return Array.from(document.querySelectorAll('#page > section, #contacts'));
	}

	function getNearestSectionIndex(fallbackY) {
		var scrollMid = fallbackY + window.innerHeight / 2;
		var sections = getSections();
		var nearestIdx = 0;
		var nearestDist = Infinity;
		sections.forEach(function (sec, idx) {
			var secTop = sec.getBoundingClientRect().top + window.scrollY;
			var secMid = secTop + sec.offsetHeight / 2;
			var dist = Math.abs(scrollMid - secMid);
			if (dist < nearestDist) {
				nearestDist = dist;
				nearestIdx = idx;
			}
		});
		return nearestIdx;
	}

	function snapToSection(sec) {
		if (sec.id === 'home') {
			window.setSnapLock(SNAP_DURATION + 300);
			window.scrollTo({ top: 0, behavior: 'smooth' });
			return;
		}
		var secTop = sec.getBoundingClientRect().top + window.scrollY;
		var secMid = secTop + sec.offsetHeight / 2;
		var targetY = Math.max(0, Math.round(secMid - window.innerHeight / 2));

		window.setSnapLock(SNAP_DURATION + 300);
		window.scrollTo({ top: targetY, behavior: 'smooth' });
	}

	window.addEventListener('scroll', function () {
		if (isSnapping) return;

		if (gestureStartY === -1) {
			gestureStartY = window.scrollY;
		}

		clearTimeout(snapTimeout);
		snapTimeout = setTimeout(function () {
			var currentY = window.scrollY;
			var deltaY = currentY - gestureStartY;

			var sections = getSections();
			var startIdx = getNearestSectionIndex(gestureStartY);
			var targetIdx = startIdx;

			// If user deliberately scrolled down
			if (deltaY > SCROLL_THRESHOLD) {
				targetIdx = Math.min(sections.length - 1, startIdx + 1);
			}
			// If user deliberately scrolled up
			else if (deltaY < -SCROLL_THRESHOLD) {
				targetIdx = Math.max(0, startIdx - 1);
			}
			// Fallback to geometric nearest if it was a giant leap (scrollbar drag)
			if (Math.abs(deltaY) > window.innerHeight) {
				targetIdx = getNearestSectionIndex(currentY);
			}

			if (sections[targetIdx]) {
				snapToSection(sections[targetIdx]);
			}

			// Reset tracking after snap decision
			gestureStartY = -1;
		}, DEBOUNCE_MS);
	}, { passive: true });
})();

