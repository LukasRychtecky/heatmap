goog.provide('heatmap')

/**
 * @license
 * heatmap.js 1.0 -    JavaScript Heatmap Library
 *
 * Copyright (c) 2011, Patrick Wied (http://www.patrick-wied.at)
 * Dual-licensed under the MIT (http://www.opensource.org/licenses/mit-license.php)
 * and the Beerware (http://en.wikipedia.org/wiki/Beerware) license.
 */

// the heatmapFactory creates heatmap instances
heatmap = (function () {

	// store object constructor
	// a heatmap contains a store
	// the store has to know about the heatmap in order to trigger heatmap updates when datapoints get added
	/**
	 * @constructor
	 * @param {*} hmap
	 */
	var store = function store(hmap) {

		// the max occurrence - the heatmaps radial gradient alpha transition is based on it
		this.max = 1;

		// data is a two dimensional array
		// a datapoint gets saved as data[point-x-value][point-y-value]
		// the value at [point-x-value][point-y-value] is the occurrence of the datapoint
		var data = [];
		var heatmap = hmap;

		this.getData = function() {
			return data;
		};
		this.setData = function(d) {
			data = d;
		};

		this.getHeatmap = function() {
			return heatmap;
		};
		this.setHeatmap = function(h) {
			heatmap = h;
		};
	};

	store.prototype = {
		// function for adding datapoints to the store
		// datapoints are usually defined by x and y but could also contain a third parameter which represents the occurrence
		addDataPoint: function (x, y) {
			if (x < 0 || y < 0)
				return;

			var me = this,
				heatmap = me.getHeatmap(),
				data = me.getData();

			if (!data[x])
				data[x] = [];

			if (!data[x][y])
				data[x][y] = 0;

			// if count parameter is set increment by count otherwise by 1
			data[x][y] += (arguments.length < 3) ? 1 : arguments[2];

			me.setData(data);
			// do we have a new maximum?
			if (me.max < data[x][y]) {
				// max changed, we need to redraw all existing(lower) datapoints
				heatmap.getActx().clearRect(0, 0, heatmap.getWidthConf(), heatmap.getHeightConf());
				me.setDataSet({ max: data[x][y], data: data }, true);
				return;
			}
			heatmap.drawAlpha(x, y, data[x][y], true);
		},

		/**
		 * @param {*} obj
		 * @param {*=} internal
		 */
		setDataSet: function (obj, internal) {
			var me = this,
				heatmap = me.getHeatmap(),
				data = [],
				d = obj.data,
				dlen = d.length;
			// clear the heatmap before the data set gets drawn
			heatmap.clear();
			this.max = obj.max;
			// if a legend is set, update it
			heatmap.getLegend() && heatmap.getLegend().update(obj.max);

			if (internal != null && internal) {
				for (var one in d) {
					// jump over undefined indexes
					if (one === undefined)
						continue;
					for (var two in d[one]) {
						if (two === undefined)
							continue;
						// if both indexes are defined, push the values into the array
						heatmap.drawAlpha(one, two, d[one][two], false);
					}
				}
			} else {
				while (dlen--) {
					var point = d[dlen];
					heatmap.drawAlpha(point.x, point.y, point.count, false);
					if (!data[point.x])
						data[point.x] = [];

					if (!data[point.x][point.y])
						data[point.x][point.y] = 0;

					data[point.x][point.y] = point.count;
				}
			}
			heatmap.colorize();
			this.setData(d);
		},
		exportDataSet: function () {
			var me = this,
				data = me.getData(),
				exportData = [];

			for (var one in data) {
				// jump over undefined indexes
				if (one === undefined)
					continue;
				for (var two in data[one]) {
					if (two === undefined)
						continue;
					// if both indexes are defined, push the values into the array
					exportData.push({x: parseInt(one, 10), y: parseInt(two, 10), count: data[one][two]});
				}
			}

			return { max: me.max, data: exportData };
		},
		generateRandomDataSet: function (points) {
			var heatmap = this.getHeatmap(),
				w = heatmap.getWidthConf(),
				h = heatmap.getHeightConf();
			var randomset = {},
				max = Math.floor(Math.random() * 1000 + 1);
			randomset.max = max;
			var data = [];
			while (points--) {
				data.push({x: Math.floor(Math.random() * w + 1), y: Math.floor(Math.random() * h + 1), count: Math.floor(Math.random() * max + 1)});
			}
			randomset.data = data;
			this.setDataSet(randomset);
		}
	};

	/**
	 * @constructor
	 * @param {*} config
	 */
	var legend = function legend(config) {
		this.config = config;

		var element = null;
		var labelsEl = null;
		var gradientCfg = null;
		var ctx = null;
		var gradientArr = null;

		this.getElement = function() {
			return element;
		};
		this.setElement = function(el) {
			element = el;
		};

		this.getLabelsEl = function() {
			return labelsEl;
		};
		this.setLabelsEl = function(l) {
			labelsEl = l;
		};

		this.getGradientCfg = function() {
			return gradientCfg;
		};
		this.setGradientCtg = function(g) {
			gradientCfg = g;
		};

		this.getCtx = function() {
			return ctx;
		};
		this.setCtx = function(c) {
			ctx = c;
		};

		this.getGradientArr = function() {
			return gradientArr;
		};
		this.setGradientArr = function(g) {
			gradientArr = g;
		};

		this.init();
	};
	legend.prototype = {
		init: function () {
			var me = this,
				config = me.config,
				title = config.title || "Legend",
				position = config.position,
				offset = config.offset || 10,
				gconfig = config.gradient,
				labelsEl = document.createElement("ul"),
				labelsHtml = "",
				grad, element, gradient, positionCss = "";

			me.processGradientObject();

			// Positioning

			// top or bottom
			if (position.indexOf('t') > -1) {
				positionCss += 'top:' + offset + 'px;';
			} else {
				positionCss += 'bottom:' + offset + 'px;';
			}

			// left or right
			if (position.indexOf('l') > -1) {
				positionCss += 'left:' + offset + 'px;';
			} else {
				positionCss += 'right:' + offset + 'px;';
			}

			element = document.createElement("div");
			element.style.cssText = "border-radius:5px;position:absolute;" + positionCss + "font-family:Helvetica; width:256px;z-index:10000000000; background:rgba(255,255,255,1);padding:10px;border:1px solid black;margin:0;";
			element.innerHTML = "<h3 style='padding:0;margin:0;text-align:center;font-size:16px;'>" + title + "</h3>";
			// create gradient in canvas
			labelsEl.style.cssText = "position:relative;font-size:12px;display:block;list-style:none;list-style-type:none;margin:0;height:15px;";


			// create gradient element
			gradient = document.createElement("div");
			gradient.style.cssText = ["position:relative;display:block;width:256px;height:15px;border-bottom:1px solid black; background-image:url(", me.createGradientImage(), ");"].join("");

			element.appendChild(labelsEl);
			element.appendChild(gradient);

			me.setElement(element);
			me.setLabelsEl(labelsEl);

			me.update(1);
		},
		processGradientObject: function () {
			// create array and sort it
			var me = this,
				gradientConfig = this.config.gradient,
				gradientArr = [];

			for (var key in gradientConfig) {
				if (gradientConfig.hasOwnProperty(key)) {
					gradientArr.push({ stop: key, value: gradientConfig[key] });
				}
			}
			gradientArr.sort(function (a, b) {
				return (a.stop - b.stop);
			});
			gradientArr.unshift({ stop: 0, value: 'rgba(0,0,0,0)' });

			me.setGradientArr(gradientArr);
		},
		createGradientImage: function () {
			var me = this,
				gradArr = me.getGradientArr(),
				length = gradArr.length,
				canvas = document.createElement("canvas"),
				ctx = canvas.getContext("2d"),
				grad;
			// the gradient in the legend including the ticks will be 256x15px
			canvas.width = "256";
			canvas.height = "15";

			grad = ctx.createLinearGradient(0, 5, 256, 10);

			for (var i = 0; i < length; i++) {
				grad.addColorStop(1 / (length - 1) * i, gradArr[i].value);
			}

			ctx.fillStyle = grad;
			ctx.fillRect(0, 5, 256, 10);
			ctx.strokeStyle = "black";
			ctx.beginPath();

			for (var i = 0; i < length; i++) {
				ctx.moveTo(((1 / (length - 1) * i * 256) >> 0) + .5, 0);
				ctx.lineTo(((1 / (length - 1) * i * 256) >> 0) + .5, (i == 0) ? 15 : 5);
			}
			ctx.moveTo(255.5, 0);
			ctx.lineTo(255.5, 15);
			ctx.moveTo(255.5, 4.5);
			ctx.lineTo(0, 4.5);

			ctx.stroke();

			// we re-use the context for measuring the legends label widths
			me.setCtx(ctx);

			return canvas.toDataURL();
		},
		getElement: function () {
			return this.getElement();
		},
		update: function (max) {
			var me = this,
				gradient = me.getGradientArr(),
				ctx = me.getCtx(),
				labels = me.getLabelsEl(),
				labelText, labelsHtml = "", offset;

			for (var i = 0; i < gradient.length; i++) {

				labelText = max * gradient[i].stop >> 0;
				offset = (ctx.measureText(labelText).width / 2) >> 0;

				if (i == 0) {
					offset = 0;
				}
				if (i == gradient.length - 1) {
					offset *= 2;
				}
				labelsHtml += '<li style="position:absolute;left:' + (((((1 / (gradient.length - 1) * i * 256) || 0)) >> 0) - offset + .5) + 'px">' + labelText + '</li>';
			}
			labels.innerHTML = labelsHtml;
		}
	};

	// heatmap object constructor
	/**
	 * @constructor
	 * @param {*} config
	 */
	var heatmap = function heatmap(config) {

		var radius = 40;
		var element = {};
		var canvas = {};
		var acanvas = {};
		var ctx = {};
		var actx = {};
		var legend = null;
		var visible = true;
		var width = 0;
		var height = 0;
		var max = false;
		var gradient = false;
		var opacity = 180;
		var premultiplyAlpha = false;
		var bl = 1000;
		var br = 0;
		var bt = 1000;
		var bb = 0;

		this.getRadius = function() {
			return radius;
		};
		this.setRadius = function(r) {
			radius = r;
		};

		this.getElement = function() {
			return element;
		};
		this.setElement = function(e) {
			element = e;
		};

		this.getCanvas = function() {
			return canvas;
		};
		this.setCanvas = function(c) {
			canvas = c;
		};

		this.getAcanvas = function() {
			return acanvas;
		};
		this.setAcanvas = function(a) {
			acanvas = a;
		};

		this.getCtx = function() {
			return ctx;
		};
		this.setCtx = function(c) {
			ctx = c;
		};

		this.getActx = function() {
			return actx;
		};
		this.setActx = function(a) {
			actx = a;
		};

		this.getLegend = function() {
			return legend;
		};
		this.setLegend = function(l) {
			legend = l;
		};

		this.getVisible = function() {
			return visible;
		};
		this.setVisible = function(v) {
			visible = v;
		};

		this.getWidthConf = function() {
			return width;
		};
		this.setWidthConf = function(w) {
			width = w;
		};

		this.getHeightConf = function() {
			return height;
		};
		this.setHeightConf = function(h) {
			height = h;
		};

		this.getMax = function() {
			return max;
		};
		this.setMax = function(m) {
			max = m;
		};

		this.getGradient = function() {
			return gradient;
		};
		this.setGradient = function(g) {
			gradient = g;
		};

		this.getOpacity = function() {
			return opacity;
		};
		this.setOpacity = function(o) {
			opacity = o;
		};

		this.getPremultiplyAlpha = function() {
			return premultiplyAlpha;
		};
		this.setPremultiplyAlpha = function(p) {
			premultiplyAlpha = p;
		};

		this.getBoundsL = function() {
			return bl;
		};
		this.setBoundsL = function(l) {
			bl = l;
		};

		this.getBoundsR = function() {
			return br;
		};
		this.setBoundsR = function(r) {
			br = r;
		};

		this.getBoundsT = function() {
			return bt;
		};
		this.setBoundsT = function(t) {
			bt = t;
		};

		this.getBoundsB = function() {
			return bb;
		};
		this.setBoundsB = function(b) {
			bb = b;
		};

		// heatmap store containing the datapoints and information about the maximum
		// accessible via instance.store
		this.store = new store(this);

		// configure the heatmap when an instance gets created
		this.configure(config);
		// and initialize it
		this.init();
	};

	// public functions
	heatmap.prototype = {
		configure: function (config) {
			var me = this,
				rout, rin;

			me.setRadius(config["radius"] || 40);
			me.setElement((config.element instanceof Object) ? config.element : document.getElementById(config.element));
			me.setVisible((config.visible != null) ? config.visible : true);
			me.setMax(config.max || false);
			me.setGradient(config.gradient || { 0.45: "rgb(0,0,255)", 0.55: "rgb(0,255,255)", 0.65: "rgb(0,255,0)", 0.95: "yellow", 1.0: "rgb(255,0,0)"});    // default is the common blue to red gradient
			me.setOpacity(parseInt(255 / (100 / config.opacity), 10) || 180);
			me.setWidthConf(config.width || 0);
			me.setHeightConf(config.height || 0);

			if (config.legend) {
				var legendCfg = config.legend;
				legendCfg.gradient = me.getGradient();
				me.setLegend(new legend(legendCfg));
			}

		},
		resize: function () {
			var me = this,
				element = me.getElement(),
				canvas = me.getCanvas(),
				acanvas = me.getAcanvas();
			canvas.width = acanvas.width = me.getWidthConf() || element.style.width.replace(/px/, "") || me.getWidth(element);
			this.setWidthConf(canvas.width);
			canvas.height = acanvas.height = me.getHeightConf() || element.style.height.replace(/px/, "") || me.getHeight(element);
			this.setHeightConf(canvas.height);
		},

		init: function () {
			var me = this,
				canvas = document.createElement("canvas"),
				acanvas = document.createElement("canvas"),
				ctx = canvas.getContext("2d"),
				actx = acanvas.getContext("2d"),
				element = me.getElement();


			me.initColorPalette();

			me.setCanvas(canvas);
			me.setCtx(ctx);
			me.setAcanvas(acanvas);
			me.setActx(actx);

			me.resize();
			canvas.style.cssText = acanvas.style.cssText = "position:absolute;top:0;left:0;z-index:10000000;";

			if (!me.getVisible())
				canvas.style.display = "none";

			element.appendChild(canvas);
			if (me.getLegend()) {
				element.appendChild(me.getLegend().getElement());
			}

			actx.shadowOffsetX = 15000;
			actx.shadowOffsetY = 15000;
			actx.shadowBlur = 15;
		},
		initColorPalette: function () {

			var me = this,
				canvas = document.createElement("canvas"),
				gradient = me.getGradient(),
				ctx, grad, testData;

			canvas.width = "1";
			canvas.height = "256";
			ctx = canvas.getContext("2d");
			grad = ctx.createLinearGradient(0, 0, 1, 256);

			// Test how the browser renders alpha by setting a partially transparent pixel
			// and reading the result.  A good browser will return a value reasonably close
			// to what was set.  Some browsers (e.g. on Android) will return a ridiculously wrong value.
			testData = ctx.getImageData(0, 0, 1, 1);
			testData.data[0] = testData.data[3] = 64; // 25% red & alpha
			testData.data[1] = testData.data[2] = 0; // 0% blue & green
			ctx.putImageData(testData, 0, 0);
			testData = ctx.getImageData(0, 0, 1, 1);
			me.setPremultiplyAlpha((testData.data[0] < 60 || testData.data[0] > 70));

			for (var x in gradient) {
				grad.addColorStop(x, gradient[x]);
			}

			ctx.fillStyle = grad;
			ctx.fillRect(0, 0, 1, 256);

			me.setGradient(ctx.getImageData(0, 0, 1, 256).data);
		},
		getWidth: function (element) {
			var width = element.offsetWidth;
			if (element.style.paddingLeft) {
				width += element.style.paddingLeft;
			}
			if (element.style.paddingRight) {
				width += element.style.paddingRight;
			}

			return width;
		},
		getHeight: function (element) {
			var height = element.offsetHeight;
			if (element.style.paddingTop) {
				height += element.style.paddingTop;
			}
			if (element.style.paddingBottom) {
				height += element.style.paddingBottom;
			}

			return height;
		},
		colorize: function (x, y) {
			// get the private variables
			var me = this,
				width = me.getWidthConf(),
				radius = me.getRadius(),
				height = me.getHeightConf(),
				actx = me.getActx(),
				ctx = me.getCtx(),
				x2 = radius * 3,
				premultiplyAlpha = me.getPremultiplyAlpha(),
				palette = me.getGradient(),
				opacity = me.getOpacity(),
				left, top, bottom, right,
				image, imageData, length, alpha, offset, finalAlpha;

			if (x != null && y != null) {
				if (x + x2 > width) {
					x = width - x2;
				}
				if (x < 0) {
					x = 0;
				}
				if (y < 0) {
					y = 0;
				}
				if (y + x2 > height) {
					y = height - x2;
				}
				left = x;
				top = y;
				right = x + x2;
				bottom = y + x2;

			} else {

				if (me.getBoundsL() < 0) {
					left = 0;
				} else {
					left = me.getBoundsL();
				}
				if (me.getBoundsR() > width) {
					right = width;
				} else {
					right = me.getBoundsR();
				}
				if (me.getBoundsT() < 0) {
					top = 0;
				} else {
					top = me.getBoundsT();
				}
				if (me.getBoundsB() > height) {
					bottom = height;
				} else {
					bottom = me.getBoundsB();
				}
			}

			image = actx.getImageData(left, top, right - left, bottom - top);
			imageData = image.data;
			length = imageData.length;
			// loop thru the area
			for (var i = 3; i < length; i += 4) {

				// [0] -> r, [1] -> g, [2] -> b, [3] -> alpha
				alpha = imageData[i],
					offset = alpha * 4;

				if (!offset)
					continue;

				// we ve started with i=3
				// set the new r, g and b values
				finalAlpha = (alpha < opacity) ? alpha : opacity;
				imageData[i - 3] = palette[offset];
				imageData[i - 2] = palette[offset + 1];
				imageData[i - 1] = palette[offset + 2];

				if (premultiplyAlpha) {
					// To fix browsers that premultiply incorrectly, we'll pass in a value scaled
					// appropriately so when the multiplication happens the correct value will result.
					imageData[i - 3] /= 255 / finalAlpha;
					imageData[i - 2] /= 255 / finalAlpha;
					imageData[i - 1] /= 255 / finalAlpha;
				}

				// we want the heatmap to have a gradient from transparent to the colors
				// as long as alpha is lower than the defined opacity (maximum), we'll use the alpha value
				imageData[i] = finalAlpha;
			}
			// the rgb data manipulation didn't affect the ImageData object(defined on the top)
			// after the manipulation process we have to set the manipulated data to the ImageData object
			image.data = imageData;
			ctx.putImageData(image, left, top);
		},
		drawAlpha: function (x, y, count, colorize) {
			// storing the variables because they will be often used
			var me = this,
				radius = me.getRadius(),
				ctx = me.getActx(),
				xb = x - (1.5 * radius) >> 0, yb = y - (1.5 * radius) >> 0,
				xc = x + (1.5 * radius) >> 0, yc = y + (1.5 * radius) >> 0;

			ctx.shadowColor = ('rgba(0,0,0,' + ((count) ? (count / me.store.max) : '0.1') + ')');

			ctx.shadowOffsetX = 15000;
			ctx.shadowOffsetY = 15000;
			ctx.shadowBlur = 15;

			ctx.beginPath();
			ctx.arc(x - 15000, y - 15000, radius, 0, Math.PI * 2, true);
			ctx.closePath();
			ctx.fill();
			if (colorize) {
				// finally colorize the area
				me.colorize(xb, yb);
			} else {
				// or update the boundaries for the area that then should be colorized
				if (xb < me.getBoundsL()) {
					me.setBoundsL(xb);
				}
				if (yb < me.getBoundsT()) {
					me.setBoundsT(yb);
				}
				if (xc > me.getBoundsR()) {
					me.setBoundsR(xc);
				}
				if (yc > me.getBoundsB()) {
					me.setBoundsB(yc);
				}
			}
		},
		toggleDisplay: function () {
			var me = this,
				visible = me.getVisible(),
				canvas = me.getCanvas();

			if (!visible)
				canvas.style.display = "block";
			else
				canvas.style.display = "none";

			me.setVisible(!visible);
		},
		// dataURL export
		getImageData: function () {
			return this.getCanvas().toDataURL();
		},
		clear: function () {
			var me = this,
				w = me.getWidthConf(),
				h = me.getHeightConf();

			me.store.setData([]);
			// @TODO: reset stores max to 1
			//me.store.max = 1;
			me.getCtx().clearRect(0, 0, w, h);
			me.getActx().clearRect(0, 0, w, h);
		},
		cleanup: function () {
			var me = this;
			me.getElement().removeChild(me.getCanvas());
		}
	};

	return {
		create: function (config) {
			return new heatmap(config);
		},
		util: {
			mousePosition: function (ev) {
				// this doesn't work right
				// rather use
				/*
				 // this = element to observe
				 var x = ev.pageX - this.offsetLeft;
				 var y = ev.pageY - this.offsetTop;

				 */
				var x, y;

				if (ev.layerX) { // Firefox
					x = ev.layerX;
					y = ev.layerY;
				} else if (ev.offsetX) { // Opera
					x = ev.offsetX;
					y = ev.offsetY;
				}
				if (typeof(x) == 'undefined')
					return;

				return [x, y];
			}
		}
	};
})();
