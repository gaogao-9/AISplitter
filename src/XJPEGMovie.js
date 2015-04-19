(function(window, undef) {
	"use strict";
	
	// using
	var Movie = AISplitter.Movie;
	
	// global set
	window.AISplitter.XJPEGMovie = XJPEGMovie;
	
	// extend
	AISplitter._extend(AISplitter.Movie,AISplitter.XJPEGMovie);
	
	// methods(prototype)
	XJPEGMovie.prototype.loadHeader   = loadHeader;   // ():void
	XJPEGMovie.prototype.getNextFrame = getNextFrame; // ():AISplitter.Frame Object
	
	// main
	function XJPEGMovie(bin){
		//see http://qiita.com/LightSpeedC/items/d307d809ecf2710bd957#%E3%81%8A%E3%81%BE%E3%81%911-new-%E3%82%92%E4%BB%98%E3%81%91%E5%BF%98%E3%82%8C%E3%81%9F%E6%99%82%E3%81%AE%E5%AF%BE%E5%BF%9C
		if (!(this instanceof XJPEGMovie)) {
			return new XJPEGMovie(arguments);
		}
		
		// call of base constructor
		Movie.call(this,bin);
	}
	
	function getNextFrame(){
		if(!this._isSuccess) return null;
	}
	
	Frames.prototype._loadend = function() {
		this.trigger("load");
	};
	
	Frames.prototype._parseAPNG = function(imageStr) {

		if (imageStr.substr(0, 8) !== PNG_SIGNATURE) {
			this.trigger("error", {error:"This file is not PNG"});
			return;
		}

		var headerData, preData = "", postData = "", isAnimated = false;

		var off = 8, frame = null, length, type, data;
		do {
			length = readDWord(imageStr.substr(off, 4));
			type = imageStr.substr(off + 4, 4);

			switch (type) {
				case "IHDR":
					data = imageStr.substr(off + 8, length);
					headerData = data;
					this.width = readDWord(data.substr(0, 4));
					this.height = readDWord(data.substr(4, 4));
					break;
				case "acTL":
					isAnimated = true;
					this.numPlays = readDWord(imageStr.substr(off + 12, 4));
					break;
				case "fcTL":
					if (frame) this.frames.push(frame);
					data = imageStr.substr(off + 8, length);
					frame = {};
					frame.width = readDWord(data.substr(4, 4));
					frame.height = readDWord(data.substr(8, 4));
					frame.left = readDWord(data.substr(12, 4));
					frame.top = readDWord(data.substr(16, 4));
					var delayN = readWord(data.substr(20, 2));
					var delayD = readWord(data.substr(22, 2));
					if (delayD === 0) delayD = 100;
					frame.delay = 1000 * delayN / delayD;
					// see http://mxr.mozilla.org/mozilla/source/gfx/src/shared/gfxImageFrame.cpp#343
					if (frame.delay <= 10) frame.delay = 100;
					this.playTime += frame.delay;
					frame.disposeOp = data.charCodeAt(24);
					frame.blendOp = data.charCodeAt(25);
					frame.dataParts = [];
					break;
				case "fdAT":
					if (frame) frame.dataParts.push(imageStr.substr(off + 12, length - 4));
					break;
				case "IDAT":
					if (frame) frame.dataParts.push(imageStr.substr(off + 8, length));
					break;
				case "IEND":
					postData = imageStr.substr(off, length + 12);
					break;
				default:
					preData += imageStr.substr(off, length + 12);
			}
			off += length + 12;
		} while (type !== "IEND" && off < imageStr.length);
		if (frame) this.frames.push(frame);

		frame = null;

		if (!isAnimated) {
			this.trigger("error", {error:"Non-animated PNG"});
			return;
		}

		// make Image
		var loadedImages = 0, _this = this;
		for (var i = 0, l = this.frames.length; i < l; ++i) {
			var img = new Image();
			frame = this.frames[i];
			frame.img = img;

			img.onload = onload(i, frame);
			img.onerror = onerror;

			var db = new DataBuilder();
			db.append(PNG_SIGNATURE);
			headerData = writeDWord(frame.width) + writeDWord(frame.height) + headerData.substr(8);
			db.append(writeChunk("IHDR", headerData));
			db.append(preData);
			for (var j = 0; j < frame.dataParts.length; ++j)
				db.append(writeChunk("IDAT", frame.dataParts[j]));
			db.append(postData);
			img.src = db.getUrl("image/png");
			delete frame.dataParts;
		}

		function onload(num, frame) {
			return function() {
				++loadedImages;

				_this.trigger("progress", {number:num, frame:frame});
				if (loadedImages === _this.frames.length) { // Load End
					_this._loadend();
				}
			};
		}

		function onerror() {
			_this.trigger("error", {error:"Image creation error"});
		}
	};

	Frames.prototype._parseXJPEG = function(imageStr) {

		var _this = this;
		var marker = String.fromCharCode(0xff);
		var SOI = marker + String.fromCharCode(0xd8);
		var EOI = marker + String.fromCharCode(0xd9);

		var data = imageStr.match(new RegExp(SOI+"[\\s\\S]+?"+EOI, "g"));

		if(!("length" in data)) {
			this.trigger("error", {error:"Can't read JPEG Binary String"});
			return;
		}

		var mSecParFrame = (function(){
			if(imageStr.substr(9, 12) !== AVI_HEADER) return null;

			var mSecParFrame = 0, mul = 1;
			for(var k=0; k<4; ++k) {
				mSecParFrame += imageStr.charCodeAt(32+k) * mul;
				mul *= 256;
			}
			mSecParFrame /= 1000;
			_this.playTime = 0;
			return mSecParFrame;
		})();

		var SOFReg = (function() {
			var SOFv = [], v = 0xc0;
			while(v <= 0xcf) {
				if(v !== 0xc4 && v !== 0xc8 && v !== 0xcc)
					SOFv.push(String.fromCharCode(v));
				++v;
			}
			return new RegExp(marker+"["+SOFv.join("")+"]");
		})();

		for(var i = 0, l=data.length; i<l; ++i) {

			var frame = {};
			var start = data[i].search(SOFReg);

			frame.height = readWord(data[i].substr(start + 5, 2));
			frame.width = readWord(data[i].substr(start + 7, 2));

			if(i === 0) {
				this.height = frame.height;
				this.width = frame.width;
				frame.top = frame.left = 0;
			} else {
				frame.top = (this.height - frame.height) / 2;
				frame.left = (this.width - frame.width) / 2;
			}

			if(mSecParFrame !== null) {
				frame.delay = mSecParFrame;
				this.playTime += mSecParFrame;
			}

			this.frames.push(frame);
		}

		if(data.length !== this.frames.length) {
			this.trigger("error", {error:"Shotage JPEG SOF data"});
			return;
		}

		// make image
		var loadedImages = 0;
		for (var i = 0, l=this.frames.length; i < l; ++i) {
			var img = new Image();
			var frame = this.frames[i];
			frame.img = img;

			img.onload = onload(i, frame);
			img.onerror = onerror;

			var db = new DataBuilder();
			db.append(data[i]);
			img.src = db.getUrl("image/jpeg");
		}

		function onload(num, frame) {
			return function() {
				++loadedImages;

				_this.trigger("progress", {number:num, frame:frame});
				if (loadedImages === _this.frames.length) { // Load End
					_this._loadend();
				}
			};
		}

		function onerror() {
			_this.trigger("error", {error:"Image creation error"});
		}
	};
	
	// utility
	var AVI_HEADER = "AVI ";
	// "\x89PNG\x0d\x0a\x1a\x0a"
	var PNG_SIGNATURE = String.fromCharCode(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
	
	function readDWord(data) {
		var x = 0;
		for (var i = 0; i < 4; ++i) x += (data.charCodeAt(i) << ((3 - i) * 8));
		return x;
	}

	function readWord(data) {
		var x = 0;
		for (var i = 0; i < 2; ++i) x += (data.charCodeAt(i) << ((1 - i) * 8));
		return x;
	}

	function writeChunk(type, data) {
		var res = "";
		res += writeDWord(data.length);
		res += type;
		res += data;
		res += writeDWord(crc32(type + data));
		return res;
	}

	function writeDWord(num) {
		return String.fromCharCode(
			((num >> 24) & 0xff),
			((num >> 16) & 0xff),
			((num >> 8) & 0xff),
			(num & 0xff)
		);
	}

	function DataBuilder() {
		this.parts = [];
	}
	DataBuilder.prototype.append = function (data) {
		this.parts.push(data);
	};
	DataBuilder.prototype.getUrl = function (contentType) {
		if (window.btoa) {
			return "data:" + contentType + ";base64," + btoa(this.parts.join(""));
		} else { // IE
			return "data:" + contentType + "," + escape(this.parts.join(""));
		}
	};


	// crc32
	var crc32 = (function() {
		var table = new Array(256);
		for(var i=0; i<256; ++i) {
			var c=i;
			for (var k=0; k<8; ++k) c = (c&1) ? 0xEDB88320 ^ (c>>>1) : c>>>1;
			table[i] = c;
		}

		return function(str) {
			var crc = -1;
			for( var i = 0, l = str.length; i < l; ++i )
				crc = ( crc >>> 8 ) ^ table[( crc ^ str.charCodeAt( i ) ) & 0xFF];
			return crc ^ (-1);
		};
	})();
})((this || 0).self || global);