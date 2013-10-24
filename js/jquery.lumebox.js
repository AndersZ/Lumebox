/* Lumebox $ plugin
 * Copyright Anders Zakrisson/Sogeti 2009-2010
 * http://anders.zakrisson.se, http://www.sogeti.se
 * This software is released under the GPL License.
 */

(function($) {
    function lumeboxItem(params){
        this.title = null;
        this.link = null;
        this.content = null;
		this.snippet = null;
        this.published = null;
        this.id = null;
        this.media = null;
    }

    function lumeboxFeed(){
        this.title = null;
        this.link = null;
        this.description = null;
        this.version = null;
        this.items = new Array();
    }

    $.lumebox = {
		loader: function(options) {
			if (options.feedApiKey != (null || undefined) ) {
				$.getScript("http://www.google.com/jsapi?key" + options.feedApiKey, function() {
					google.load("feeds", "1", {"nocss" : true, "callback" : function() {
						$.lumebox.init(options);
					}});
				});
			} else {
				$.lumebox.init(options);
			}
		},

        settings: {
            showAsList: false,
            rss: new Array(),
            proxy: "",
            duration: "medium",
            rssWidth: 680,
            opacity: "0.7",
            loop: true,
            scrollToTop: false,
            autoNext: false,
            parentElementId: false,
            useParentOffset: true,
            useGestures: true,
			graphicsDir: "style/",
			feedApiKey: false,
			platformMode: "auto",
			noCaptionClass: "tn"
        },

        data: {
            lumeboxItems: new lumeboxFeed(),
            lumeboxFeeds: new Object(),
            popupStatus: 0,
            group: null,
            timeoutId: null,
			parentElement: null,
            index: 1
        },

        init: function(options){
            // Check for options and merge
            (options) ? $.lumebox.settings = $.extend({}, $.lumebox.settings, options) : options = {};

            if (this.settings.parentElementId) {
                $.lumebox.data.parentElement = $("#" + this.settings.parentElementId);
            } else {
                $.lumebox.data.parentElement = $("body").eq(0);
            }

			$.lumebox.data.parentElement.append('<div id="lumebox-popup"><div id="lumebox-topmenu"><a href="#" id="lumebox-close" class="lumebox-controls"><img src="' + $.lumebox.settings.graphicsDir +'icon_close.png"></a><p id="lumebox-counter"></p></div><div id="lumebox-content"></div></div><div id="lumebox-bg"></div>');
			
			// find out if it's a mobile device and set some options if that's the case
            if ($.lumebox.settings.platformMode == "auto" && ((navigator.platform.indexOf("iPhone") != -1) || (navigator.platform.indexOf("iPod") != -1) || (navigator.userAgent.indexOf("iPad") != -1) || (navigator.userAgent.indexOf("Android") != -1))) {
			    $.lumebox.settings.platformMode = "mobile";
				$.lumebox.settings.opacity = 1;
				$("#lumebox-popup").addClass("mobile");
			}
			
            /* User interactions and events */
			
			// Close by clicking the "X"
			$("#lumebox-close").click(function(){
                $.lumebox.close();
            });

            // Close by clicking outside the content
            if ($.lumebox.settings.platformMode != "mobile") {
				$("#lumebox-bg").click(function(){
					$.lumebox.close();
				});
			}
			
            // Navigate using gestures (or taps) on mobile devices
			if ($.lumebox.settings.platformMode == "mobile") {
                $("#lumebox-content, #lumebox-bg").quickGestures({
					dragRight: function () {$.lumebox.previous();},
                    dragLeft: function () {$.lumebox.next();},
					mobile: true,
					drag: $("#lumebox-content"),
					threshold: 50
                });
            } else {
				// navigate using position of click on non-mobile
				$("#lumebox-content").quickGestures({
                    clickLeft: function () {$.lumebox.previous();},
                    clickRight: function () {$.lumebox.next();}
                });
			}
			
			/*// Naigate by clicking the left or right side of the popup
			$("#lumebox-content").quickGestures({
				clickLeft: function () {$.lumebox.previous();},
				clickRight: function () {$.lumebox.next();}
            });*/

            // Keypress events
            $(document).keydown(function(e){
                if ($.lumebox.data.popupStatus == 1) {
                    switch (e.keyCode) {
                        case 27:
                            $.lumebox.close();
                            break; // Close by pressing Esc
                        case 39:
                            $.lumebox.next();
                            break; // Next by pressing left-arrow
                        case 78:
                            $.lumebox.next();
                            break; // Next by pressing n
                        case 37:
                            $.lumebox.previous();
                            break; // Previous by right-arrow
                        case 80:
                            $.lumebox.previous();
                            break; // Previous by right-arrow
                    }
                    switch (e.charCode) {
                        case 110:
                            $.lumebox.next();
                            break; // Next by pressing n
                        case 112:
                            $.lumebox.previous();
                            break; // Previous by pressing p
                    }
                }
            });

            // Center and resize if the window is resized
            $(window).bind('resize', function(){
                $.lumebox.resize();
            });

            // find all links with rel="lightbox[groupName]"
            var lFeed;
            $("a[rel^=lightbox]").each(function(){
                // Get Group-name
                var group = this.rel.match(/\[([a-zA-Z0-9\-]*)\]/i);
                group = (group) ? group[1] : null;

                // Create new group if it doesn't exist
                if (group && $.lumebox.data.lumeboxFeeds[group]) {
                    lFeed = $.lumebox.data.lumeboxFeeds[group];
                }
                else
                if (group) {
                    lFeed = new lumeboxFeed();
                    lFeed.title = group;
                    $.lumebox.data.lumeboxFeeds[group] = lFeed;
                }

                // Change the links to open the lightbox instead of hyperlinking

                if (this.href.search(/(\.jpg|\.jpeg|\.gif|\.png)$/i) != -1) {
                    var arrayIndex, lItem = new lumeboxItem();
                    // Createn new lumeboxItem in the form of an image and add to the list
					if ($(this).attr("class") && !$(this).attr("class").match($.lumebox.settings.noCaptionClass)) lItem.content = this.title;
                    lItem.link = this.href;

                    // Push to the right group
                    arrayIndex = (group ? $.lumebox.data.lumeboxFeeds[group].items.push(lItem) - 1 : $.lumebox.data.lumeboxItems.items.push(lItem) - 1);
                    lItem.id = group + "-" + arrayIndex;

                    // Intercept clicks on the link
                    $(this).click(function() {
                        $.lumebox.open({
                            index: arrayIndex,
                            group: group
                        });
                        return false;
                    });
                }
                else
                if ($.lumebox.settings.feedApiKey != false && this.rel.search(/lightbox\[(rss[a-zA-Z0-9\-]*)\]/i) != -1) {
					var a = this;
                    $.lumebox.parseFeed({
                        url: $.lumebox.settings.proxy + this.href,
                        success: function(feed){
                            $.each(feed.items, function(j, post){
                                // Create item
                                lItem = $.extend({}, lItem, post);

                                // Push to the right group
                                (group) ? $.lumebox.data.lumeboxFeeds[group].items.push(lItem) - 1 : $.lumebox.data.lumeboxItems.items.push(lItem) - 1;
                            });

							// Intercept clicks on the link
							$(a).click(function() {
								$.lumebox.open({
									index: null,
									group: group
								});
								return false;
							});
                        }
                    });
                }
            });

            // Add RSS-posts and media from constructor
            $.each($.lumebox.settings.rss, function(i, item){
                $.lumebox.parseFeed({
                    url: $.lumebox.settings.proxy + item,
                    success: function(feed){
                        $.each(feed.items, function(j, post){
                            var lItem = $.extend({}, lItem, post);
                            $.lumebox.data.lumeboxItems.items.push(lItem);
                        });
                    }
                });
            });

            return this;
        },

        // Resize and center the popup
        resize: function(callback){
            if ($.lumebox.data.popupStatus == 1) {
				var margin = parseInt($("#lumebox-popup").css("margin-top").replace("px",""));
				var captionHeight = ($.lumebox.settings.platformMode == "mobile") ? 0 : $("#lumebox-caption").outerHeight(true);
				
                var windowWidth = $(window).width() - 2*margin;
                var windowHeight = $(window).height() - 2*margin;
				// Check if it's a single lumebox image in the popup
				var singleImg = ($("#lumebox-content").find("img.lumebox-img").attr("src")) ? $("#lumebox-content").find("img.lumebox-img").eq(0) : false;

                /* If the content is a lightboxed image in single item display we
                 * pick the image width as the width of the popup, otherwise we use
                 * the windowWidth. If the single image is larger than the window,
				 * we resize it.
                 */
                var contentWidth = (singleImg) ? singleImg.attr("width") : windowWidth;
				
				// Check if single image is bigger than the window, if it is, scale it down
                if (singleImg) {
                    var imgRatio = singleImg.attr("width") / singleImg.attr("height");
                    var newWidth = 0;
                    var newHeight = 0;

                    if (singleImg[0].naturalWidth + 2*margin > windowWidth) {
                        newWidth = windowWidth;
                        newHeight = windowWidth / imgRatio;

                        contentWidth = windowWidth;
                    }else {
                        newWidth = singleImg[0].naturalWidth;
                        newHeight = singleImg[0].naturalWidth / imgRatio;
                    }

                    if (newHeight + captionHeight + 2*margin >= windowHeight) {
                        var newImgHeight = windowHeight - captionHeight - 2*margin;
                        newHeight = newImgHeight;
                        newWidth = newImgHeight * imgRatio;

                        contentWidth = newHeight * imgRatio;
                    } else {
                        contentWidth = newWidth;
                    }

                    singleImg.attr("width",newWidth);
                    singleImg.attr("height", newHeight);
                } else {
                    // if not single image, set the width to predefined value
                    contentWidth = $.lumebox.settings.rssWidth;
                }
				
				// Check contentWidth, if it's zero then set it to windowWidth
				if (contentWidth < 1) contentWidth = windowWidth;

                // Resize and center
				$("#lumebox-popup").css({
                    width: contentWidth,
					left: ((windowWidth - contentWidth) / 2) - (($.lumebox.settings.useParentOffset) ? $("body").offset().left : 0)
                });
                var popupHeight = $("#lumebox-content").outerHeight(true) + $("#lumebox-footer").outerHeight(true);
				$("#lumebox-popup").css({
                    height: popupHeight,
                    top:  $(window).scrollTop() + ((popupHeight > windowHeight) ? 0 : windowHeight / 2 - popupHeight / 2)
				});
                
				// Scroll to top
                if ($.lumebox.settings.scrollToTop)
					$(this).scrollTop(0);
				// Execute possible callback
                if ($.isFunction(callback))
					callback();
            }
        },

        // Open and show the popup
        open: function(options){
            if (!options)
                options = new Object();

            $.lumebox.data.group = (options.group) ? options.group : null;
            var group = (options.group) ? $.lumebox.data.lumeboxFeeds[options.group] : $.lumebox.data.lumeboxItems;
            $.lumebox.data.index = (options.index) ? options.index : 0;

            // ShowAsList =>  Multiple items in a long list
			var items;
            if ($.lumebox.settings.showAsList) {
				items = group.items;
            } else {
				// Single items
                var item = group.items[$.lumebox.data.index];
				items = [item];
            }
			
			// Fade in the bg and load the html
			if ($.lumebox.data.popupStatus == 0) {
				$("#lumebox-bg").css({
						"opacity": $.lumebox.settings.opacity
					});
					
					// hide everything for mobile, fade in overlay for desktop
					if ($.lumebox.settings.platformMode == "mobile") {
						$("body > *").addClass("lumebox-hidden");
						$("html, body").addClass("lumebox");
					}
						
					$("#lumebox-bg").fadeIn("fast", function() {
						$("#lumebox-popup").css("opacity", 0).show();
					
						$.lumebox.data.popupStatus = 1;
						$.lumebox.switchPost(items, 0, group);
					});
			}
        },

        // Close the popup
        close: function(){
            // Close popup only if it is open
            if ($.lumebox.data.popupStatus == 1) {
				if($.lumebox.settings.platformMode == "mobile") {
					$("body > *").removeClass("lumebox-hidden");
					$("html, body").removeClass("lumebox");
				}
					$("#lumebox-bg").fadeOut($.lumebox.settings.duration);
                $("#lumebox-popup").fadeOut($.lumebox.settings.duration);
                $.lumebox.data.popupStatus = 0;
            }
            // Cancel any intervals
            clearInterval($.lumebox.data.timeoutId);
        },

        next: function(){
            // Get the item
            var group = ($.lumebox.data.group ? $.lumebox.data.lumeboxFeeds[$.lumebox.data.group] : $.lumebox.data.lumeboxItems);
            $.lumebox.data.index = (($.lumebox.data.index < group.items.length - 1) ? $.lumebox.data.index + 1 : 0);
            var item = group.items[$.lumebox.data.index];

            // Switch to the new item
            $.lumebox.switchPost([item], "next", group);
        },

        previous: function(){
            var group = ($.lumebox.data.group ? $.lumebox.data.lumeboxFeeds[$.lumebox.data.group] : $.lumebox.data.lumeboxItems);
            $.lumebox.data.index = (($.lumebox.data.index > 0) ? $.lumebox.data.index - 1 : group.items.length - 1);
            var item = group.items[$.lumebox.data.index];

            $.lumebox.switchPost([item], "previous", group);
        },

        switchPost: function(items, prevNext, group, callback) {
            if ($.lumebox.data.popupStatus == 1) {
			
				// find if the link has a thumbail, use it while the real image is loading if that's the case
				/*var tn = $("a[href="+items[0].link+"] img");
				if (tn.eq(0)) {
					$("#lumebox-content").html('<div class="post"><div class="post-body"><img src="'+tn.attr("src")+'" /></div></div>');
				}*/
				
				var transitionMap = {opacity: 0};
				
				/*if (prevNext != undefined) {
					if (prevNext == "next") {
						// transitionMap = {left: -$("#lumebox-popup").width()};
						transitionMap = {left: -$("#lumebox-popup").width()};
					} else if (prevNext == "previous") {
						// transitionMap = {left: $(window).width()};
						transitionMap = {left: $(window).width()};
					}
				}*/
			
                // Hide the contents of the popup (the whole popup for desktop, only the content for mobile)
				var container = ($.lumebox.settings.platformMode == "mobile") ? $("#lumebox-content") : $("#lumebox-popup");
				container.animate(transitionMap, $.lumebox.settings.duration, function() {
					
					// container.css({opacity: 0});
					
					// Reset transforms for mobile
					if ($.lumebox.settings.platformMode == "mobile") {
						$(this).css("-webkit-transform", "translate3d(0,0,0)");
					}

					// Load the HTML into the DOM
					$("#lumebox-content").css("opacity", 0).lboxFillContent(items, function() {
						// Show the popup, but hide the content to be able to calculate size
						$("#lumebox-popup").css("opacity", 1);
						// Write out the number of items and this items position
						$("#lumebox-counter").html(($.lumebox.data.index+1) + "/" + group.items.length);
						// Resize and fade in the new content
						$.lumebox.resize(function () {
							$("#lumebox-popup").children(":not(.lumebox-controls)").animate({
								opacity: 1
							}, $.lumebox.settings.duration);
								
							if ($.isFunction(callback)) callback();
						});
					});	
				});
            }
        },

        parseFeed: function(options){
			if (options.url.search(/^http/i) != -1) {
				var rssFeed = new google.feeds.Feed(options.url);
				rssFeed.load(function(fetchedFeed) {
					var feed = new lumeboxFeed();
					feed.title = fetchedFeed.feed.title;
                    feed.link = fetchedFeed.feed.link;
                    feed.description = fetchedFeed.feed.description;
                    feed.version = fetchedFeed.feed.type;

					// result.feed.entries
					$(fetchedFeed.feed.entries).each(function(i, entry){
                            var lItem = new lumeboxItem();
                            lItem.title = entry.title;
                            lItem.link = entry.link;
                            lItem.published = entry.publishedDate;
                            lItem.id = entry.link;
                            lItem.content = entry.content;
							lItem.snippet = entry.contentSnippet;
							
							feed.items.push(lItem);
                        });
						
					// Execute the success-callback if present
                    if ($.isFunction(options.success))
                        options.success(feed);
				});
			}
        },

		// Ajax loading of images
		loadImage: function(item, callback){
            // Check if the image is pre-loaded
            if ($("#lboxItem-" + item.id).length < 1) {
				$("<img />").attr("src", item.link).load(callback);
    		}

			// Preload the next 2 items
			// only keep max 50 items preloaded
			if ($("#lumebox-bg").find(".lumebox-preLoaded").length > 50) {
                $("#lumebox-bg").find(".lumebox-preLoaded").eq(0).remove();
			}

            var group = ($.lumebox.data.group ? $.lumebox.data.lumeboxFeeds[$.lumebox.data.group] : $.lumebox.data.lumeboxItems);
            var nextIndex = (($.lumebox.data.index < group.items.length - 1) ? $.lumebox.data.index + 1 : 0);
			var nextNextIndex = (($.lumebox.data.index < group.items.length - 2) ? $.lumebox.data.index + 2 : 0);
            var nextItems = [group.items[nextIndex], group.items[nextNextIndex]];
            
            // Only load the next photo if it's not already loaded
			$.each(nextItems, function(i, nextItem) {
				if ($("#lboxItem-" + nextItem.id).length < 1) {
					$("<img />").attr("src", nextItem.link).load(function() {
						$(this).attr({
							"class": "lumebox-preLoaded",
							id: "lboxItem-" + nextItem.id,
							width: this.width,
							height: this.height
							}).appendTo("#lumebox-bg");
					});
				}
			});
            
		}
    };
	
	// Function which loads images and appends posts
	$.fn.lboxFillContent = function(lumeboxItems, callback) {
		return this.each(function() {
			var el = this;
			
			// If the collection is a single image
			if (lumeboxItems.length == 1 && lumeboxItems[0].link.search(/(\.jpg|\.jpeg|\.gif|\.png)$/i) != -1) {
				lumeboxItem = lumeboxItems[0];
				
				// Check if the image is pre-loaded
				if ($("#lboxItem-" + lumeboxItem.id).length > 0) {
                   $.lumebox.loadImage(lumeboxItem);

                   $(el).html($("#lboxItem-" + lumeboxItem.id).clone().attr("class","lumebox-img"));
				   $(el).find("img.lumebox-img").wrap('<div class="post"><div class="post-body"></div></div>');

					if (lumeboxItem.content) {
						$(el).find("div.post-body").append('<div id="lumebox-caption">' + lumeboxItem.content + '</div>');
					}
					
					if ($.isFunction(callback))
                        callback();
				} else {
					$.lumebox.data.parentElement.append('<div id="lumebox-loading"><img src="'+$.lumebox.settings.graphicsDir+'ajax-loader.gif" /> Loading</div>');
					$.lumebox.loadImage(lumeboxItem, function() {
						$("#lumebox-loading").remove();
						$(this).attr({
							"class": "lumebox-img",
							width: this.width,
							height: this.height
						});
						$(el).html(this).find("img.lumebox-img").wrap('<div class="post"><div class="post-body"></div></div>');

						if (lumeboxItem.content) {
							$(el).find("div.post-body").append('<div id="lumebox-caption">' + lumeboxItem.content + '</div>');
						}
						
						if ($.isFunction(callback))
							callback();
				});
				}
				
			} else {
				html = "";
				$.each(lumeboxItems, function(j, lumeboxItem){
					var title = "", content = "";
					if (lumeboxItem.title)
						title = '<div class="post-title"><h2><a href="' + lumeboxItem.link + '">' + lumeboxItem.title + '</a></h2></div>';
			
					content = lumeboxItem.content;
					html += '<div class="post hentry">' + title + '<div class="post-body>">' + content + '</div></div>';
				});
				
				$(el).html(html);
				
				if ($.isFunction(callback))
                        callback();
			}
			
		});
	}
	

    // Gesture plugin
    $.fn.quickGestures = function(options) {
        settings = $.extend({
            dragLeft: null,
            dragRight: null,
			clickLeft: null,
			clickRight: null,
			tap: null,
			hold: null,
			holdTime: 1200,
            threshold: 50,
			mobile: false,
			drag: true
        }, options);

        this.each(function() {
            var data = {
                x: 0,
                y: 0,
                t: null,
                time: null
            };

			/* Events for desktop */
			if (!settings.mobile) {
            $(this).mousedown(function(e) {
				e.preventDefault();
				
				var offsetLeft = ($(window).width()-$(this).outerWidth(true))/2;
				var offsetTop = ($(window).height()-$(this).outerHeight(true))/2;
                data.x = e.pageX - offsetLeft;
                data.y = e.pageY - offsetTop;
                data.time = new Date();
                
                // Hold events
                if ($.isFunction(settings.hold)) {
					data.t = setTimeout("settings.hold()",settings.holdTime);
                }

				// Tap events
				$(this).mouseup(function() {
					if (data.t != null) clearTimeout(data.t);
					var diffX = (e.pageX - offsetLeft) - data.x;
                    var now = new Date();

                    if (now.getTime() - data.time.getTime() < settings.holdTime && diffX < settings.threshold) {
                        if (data.x < $(this).width()/2 && $.isFunction(settings.clickLeft)) {
							settings.clickLeft();
					    } else if (data.x >= $(this).width()/2 && $.isFunction(settings.clickRight)) {
							settings.clickRight();
					    } else if ($.isFunction(settings.tap)) {
                            settings.tap();
					    }
 					}
                    $(this).unbind("mouseup");
				});
				
				// Click and drag events
                $(this).mousemove(function(e) {
					// unbind mousemove if the button is released (or finger is lifted)
					$(this).mouseup(function() {
						$(this).unbind("mousemove");
					});
                    var diffX = (e.pageX - offsetLeft) - data.x;
					
                    if (diffX <= -settings.threshold) {
                        $(this).unbind("mousemove");
                        if ($.isFunction(settings.dragLeft)) settings.dragLeft();
                    } else if (diffX >= settings.threshold) {
                        $(this).unbind("mousemove");
                        if ($.isFunction(settings.dragRight)) settings.dragRight();
                    }
                });
            });
			} else {
				/* Events for mobile browsers */
				var lastPageX, lastPageY, offsetLeft, offsetTop, diffX = 0, diffY = 0, el = $(this);

				el[0].addEventListener('touchstart', function(e) {
					e.preventDefault();
					
					offsetLeft = ($(window).width()-el.outerWidth(true))/2;
					offsetTop = ($(window).height()-el.outerHeight(true))/2;
					data.x = e.targetTouches[0].pageX - offsetLeft;
					lastPageX = data.x;
					data.y = e.targetTouches[0].pageY - offsetTop;
					lastPagY = data.y;
					data.time = new Date();

					// Start timer for hold event
					if ($.isFunction(settings.hold)) {
						data.t = setTimeout("settings.hold()",settings.holdTime);
					}
				}, false);
				
				el[0].addEventListener("touchmove", function(e) {
					e.preventDefault();
					var touchX = e.touches[0].pageX || e.changedTouches[0].pageX;
					var touchY = e.touches[0].pageY || e.changedTouches[0].pageY;
					lastPageX = touchX - offsetLeft;
					lastPageY = touchY - offsetTop;
					diffX = (lastPageX - offsetLeft) - data.x;
					diffY = (lastPageY - offsetTop) - data.y;
					
					if (settings.drag) {
						settings.drag.css("-webkit-transform", "translate3d("+diffX+"px, 0, 0)");
					}
				}, false);
				
				el[0].addEventListener("touchend", function(e) {
					e.preventDefault();
					
					if (data.t != null) clearTimeout(data.t); // End timer for hold event if it hasn't been triggered
                    var now = new Date();
					
					if (diffX <= -settings.threshold) {
                        if ($.isFunction(settings.dragLeft)) {
							settings.dragLeft();
						}
                    } else if (diffX >= settings.threshold) {
                        if ($.isFunction(settings.dragRight)) {
							settings.dragRight();
						}
                    } else if ((now.getTime() - data.time.getTime()) < settings.holdTime) {
                        if (data.x < el.width()/2 && $.isFunction(settings.clickLeft)) {
							settings.clickLeft();
					    } else if (data.x >= el.width()/2 && $.isFunction(settings.clickRight)) {
							settings.clickRight();
					    } else if ($.isFunction(settings.tap)) {
                            settings.tap();
					    }
 					} else if ($.isFunction(settings.hold)) {
						settings.hold();
					} else {
						settings.drag.css("-webkit-transform", "translate3d(0, 0, 0)");
					}					
				}, false);
			}
        });

        return this;
    };

	var lboxOptions = (typeof lumeboxOptions != "undefined") ? lumeboxOptions : new Object();
	$.lumebox.loader(lboxOptions);
})(jQuery);