/**
 * Parallaxor - v0.10.1
 * Simple jQuery plugin which allows you to create 
 * beautiful parallax effects for your website
 * https://github.com/alexandrubau/parallaxor
 *
 * Copyright 2014 Alexandru Bau
 * Released under the GNU General Public License
 * http://www.gnu.org/copyleft/gpl.html
 */
;(function($, window, document, undefined){

    /**
     * The name of the plugin
     * @type {String}
     */
    var pluginName = 'parallaxor';

    /**
     * The plugin namespace
     * @type {String}
     */
    var namespace   = 'ab.' + pluginName;

    /**
     * Variable holding default settings for this plugin
     * @type {Object}
     */
    var settingDefaults = {
        top     : true,
        layers  : {}
    };

    /**
     * Variable holding default settings for layers
     * @type {Object}
     */
    var layerDefaults   = {
        distance    : '100%',
        direction   : 'down'
    };

    /**
     * Variable holding css classes for elements
     * @type {Object}
     */
    var cssClass = {
        container   : pluginName + '-container',
        layer       : pluginName + '-layer'
    };

    /**
     * The Plugin object constructor
     * @param {Object} element The jQuery element
     * @param {Object} options The options object passed
     */
    function Plugin(element, options){

        // remember reference for myself which will be needed later
        var me = this;

        // apply plugin default settings
        this.settings   = $.extend({}, settingDefaults, options);

        // apply layer default settings
        $.each(this.settings.layers, function(key, value){
            me.settings.layers[key] = $.extend({}, layerDefaults, value);
        });

        // remember the container and the layers
        this.container  = $(element);   // make sure is a jQuery object
        this.layers     = [];           // this will be built later, check init()
        this.cache      = {}            // variable holding cached values in order to improve performance

        // initialize the plugin
        this.init();
    }

    /**
     * Here we use $.extend in order to avoid Plugin.prototype conflicts
     */
    $.extend(Plugin.prototype, {
        init: function(){

            // remember reference for myself which will be needed later
            var me = this;

            // add css class to container
            this.container.addClass(cssClass.container);

            // iterate through all the layers, save the settings in data and add css class
            $.each(this.settings.layers, function(selector, settings){
                $.merge(me.layers, me.container.find(selector).data(namespace + '.layer', settings).addClass(cssClass.layer));
            });

            // bind the reconfigure event, to recalculate the cache values
            this.container.on(namespace + '.reconfigure', $.proxy(this.onReconfigure, this));

            // start binding events
            $(document).on('scroll', $.proxy(this.onDocumentScroll, this));
            $(document).on('ready', $.proxy(this.onDocumentReady, this));
            $(window).on('resize', $.proxy(this.onWindowResize, this));
        },

        /**
         * Method called to recalculate the cache values
         */
        onReconfigure: function(){

            this.cache = {
                window: {
                    height: $(window).height()
                },
                container: {
                    offset: {
                        top: this.container.offset().top
                    },
                    height: {
                        outer: this.container.outerHeight()
                    }
                },
                scroll: {
                    diff: (this.container.offset().top - this.getInt(this.settings.top) + $(window).height()) - this.container.offset().top
                }
            };
        },

        /**
         * Method called after the document has been loaded
         */
        onDocumentReady: function(){
            this.container.trigger( namespace + '.reconfigure');
            this.moveLayers();
        },

        /**
         * Method called each time we scroll the document
         */
        onDocumentScroll: function(){
            this.container.trigger( namespace + '.reconfigure');
            this.moveLayers();
        },

        /**
         * Method called when we resize the window
         */
        onWindowResize: function(){
            this.container.trigger( namespace + '.reconfigure');
            this.moveLayers();
        },

        /**
         * Method called each time we want to move the layers
         * @return {[type]} [description]
         */
        moveLayers: function(){

            // remember reference for myself which will be needed later
            var me = this, cache = this.cache;

            // check if the container is in view range
            if( !this.isInVisualRange() ){
                return;
            }

            var viewRange, viewScroll, viewPercentage;

            // calucate viewRange and viewScroll based on top value
            if( this.settings.top === true ){

                viewRange   = cache.container.height.outer,
                viewScroll  = this.getDocumentScrollTop() - cache.container.offset.top;

            } else if( this.settings.top === false ){

                viewRange   = cache.container.height.outer + cache.window.height,
                viewScroll  = this.getDocumentScrollTop() + cache.window.height - cache.container.offset.top;

            } else {

                // check if the container is above the specified top value ( if exists )
                if( !this.isAboveTop() ){
                    return;
                }

                viewRange   = cache.container.height.outer + cache.window.height - cache.scroll.diff,
                viewScroll  = this.getDocumentScrollTop() + cache.window.height - cache.container.offset.top - cache.scroll.diff;
            }

            // calculate the view percentage
            viewPercentage  = (viewScroll * 100 / viewRange);

            // console.log('viewRange: ', viewRange, 'viewScroll: ', viewScroll, 'viewPercentage: ', viewPercentage);

            // make sure no funny business is happening
            if( viewPercentage < 0 || viewPercentage > 100 ){
                return;
            }
            
            // iterate through all the layers and apply the corresponding options
            $.each(this.layers, function(undefined, layer){

                // make sure that layer is a jQuery object
                layer = $(layer);

                // extract data variable and hold it for later use
                var data = layer.data(namespace + '.layer'),
                    distance;

                // check if distance is procentual or pixel
                if( me.isPercentual(data.distance) ){
                    distance = me.getInt(data.distance)/100 * (layer.outerHeight() - cache.container.height.outer);
                } else {
                    distance = me.getInt(data.distance);
                }

                // determine transformation based on direction
                var cssTransform;
                switch(data.direction){
                    case 'up':
                        cssTransform = 'translate(0, -' + (viewPercentage/100 * distance) + 'px)';
                    break;
                    case 'left':
                        cssTransform = 'translate(-' + (viewPercentage/100 * distance) + 'px, 0)';
                    break;
                    case 'right':
                        cssTransform = 'translate(' + (viewPercentage/100 * distance) + 'px, 0)';
                    break;
                    default: // case 'down':
                        cssTransform = 'translate(0, ' + (viewPercentage/100 * distance) + 'px)';
                    break;
                }

                // apply the css style
                layer.css('transform', cssTransform);
            });
        },

        /**
         * Method used to retreive the scroll distance of the document
         * We use this function because on OS X the normal function could return negative values
         * @return {int}
         */
        getDocumentScrollTop: function(){
            var scrollTop = $(document).scrollTop();
            return scrollTop >= 0 ? scrollTop : 0;
        },

        /**
         * Method used for checking if the container is in visual range
         * @return {Boolean} 
         */
        isInVisualRange: function(){

            var cache = this.cache;

            if( cache.container.offset.top + cache.container.height.outer >= this.getDocumentScrollTop() &&
                this.getDocumentScrollTop() >= cache.container.offset.top - cache.window.height ){

                return true;
            }

            return false;
        },

        /**
         * Checks if character % is found in the string
         * @param  {String}  value The string to be examined
         * @return {Boolean}
         */
        isPercentual: function(value){
            return typeof value === 'string' && value.slice(-1) === '%';
        },

        /**
         * Method used for extracting the int from values such as: '100px', '50%', '100', 78, true, false
         * @param  {[type]} value [description]
         * @return {[type]}       [description]
         */
        getInt: function(value){
            return typeof value === 'boolean' ? 0 : (parseInt(value) || 0);
        },

        /**
         * Method used for checking if the container is above the specified top limit value ( if exists )
         * @return {Boolean}
         */
        isAboveTop: function(){
            return this.getDocumentScrollTop() + this.getInt(this.settings.top) > this.cache.container.offset.top;
        }
    });

    /**
     * A really lightweight plugin wrapper around the constructor, preventing against multiple instantiations
     */
    $.fn[pluginName] = function(options){

        this.each(function(){
            if( $.data(this, namespace) ){
                return true;
            }
            $.data(this, namespace, new Plugin(this, options));
        });
        
        return this; // chain jQuery functions
    };

})(jQuery, window, document);