(function(window, undef) {
	"use strict";
	
	// using
	var Movie = AISplitter.Movie;
	
	// global set
	window.AISplitter.XJPEGMovie = XJPEGMovie;
	
	// extend
	AISplitter._extend(AISplitter.Movie,AISplitter.XJPEGMovie);
	
	// methods(prototype)
	XJPEGMovie.prototype.loadHeader       = loadHeader;       // ():void
	XJPEGMovie.prototype.moveToFirstFrame = moveToFirstFrame; // ():boolean
	XJPEGMovie.prototype.getNextFrame     = getNextFrame;     // ():AISplitter.XJPEGFrame Object
	
	// main
	function XJPEGMovie(bin){
		//see http://qiita.com/LightSpeedC/items/d307d809ecf2710bd957#%E3%81%8A%E3%81%BE%E3%81%911-new-%E3%82%92%E4%BB%98%E3%81%91%E5%BF%98%E3%82%8C%E3%81%9F%E6%99%82%E3%81%AE%E5%AF%BE%E5%BF%9C
		if (!(this instanceof XJPEGMovie)) {
			return new XJPEGMovie(arguments);
		}
		
		// call of base constructor
		Movie.call(this,bin);
	}
	
	// utility
	var AVI_HEADER = "AVI ";
	
	function loadHeader(){
		var marker = String.fromCharCode(0xff);
		var SOI = marker + String.fromCharCode(0xd8);
		var EOI = marker + String.fromCharCode(0xd9);
		
		this._binary
		var data = imageStr.match(new RegExp(SOI+"[\\s\\S]+?"+EOI, "g"));
		
		if(!("length" in data)) {
			throw new Error("Can't read JPEG Binary String");
			return;
		}
	}
	
	function getNextFrame(){
		if(!this._isSuccess) return null;
	}

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
		
		var SOFReg = new RegExp("\u00ff\u005b\u00c0\u00c1\u00c2\u00c3\u00c5\u00c6\u00c7\u00c9\u00ca\u00cb\u00cd\u00ce\u00cf\u005d");
		/*
			// generator
			var SOFReg = (function() {
				var SOFv = [], v = 0xc0;
				while(v <= 0xcf) {
					if(v !== 0xc4 && v !== 0xc8 && v !== 0xcc)
						SOFv.push(String.fromCharCode(v));
					++v;
				}
				return new RegExp(marker+"["+SOFv.join("")+"]");
			})();
		*/
		
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