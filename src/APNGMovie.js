(function(window, undef) {
	"use strict";
	
	// using
	var Movie = AISplitter.Movie;
	
	// global set
	window.AISplitter.APNGMovie  = APNGMovie;
	
	// extend
	AISplitter._extend(AISplitter.Movie,AISplitter.APNGMovie);
	
	// methods(prototype)
	APNGMovie.prototype.loadHeader       = loadHeader;       // ():void
	APNGMovie.prototype.moveToFirstFrame = moveToFirstFrame; // ():boolean
	APNGMovie.prototype.getNextFrame     = getNextFrame;     // ():AISplitter.APNGFrame Object
	
	// main
	function APNGMovie(bin){
		//see http://qiita.com/LightSpeedC/items/d307d809ecf2710bd957#%E3%81%8A%E3%81%BE%E3%81%911-new-%E3%82%92%E4%BB%98%E3%81%91%E5%BF%98%E3%82%8C%E3%81%9F%E6%99%82%E3%81%AE%E5%AF%BE%E5%BF%9C
		if (!(this instanceof APNGMovie)) {
			return new APNGMovie(arguments);
		}
		
		this._headerOffset = 0;
		this._headerLength = 0;
		
		// call of base constructor
		Movie.call(this,bin);
	}
	
	// "\x89 P N G \x0D \x0A \x1A \x0A"
	var PNG_SIGNATURE = String.fromCharCode(0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A);
	// "\x00 \x00 \x00 \x00 I E N D \xAE \x42 \x60 \x82"
	var PNG_IEND = String.fromCharCode(0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82);
	
	function loadHeader(){
		if(this._readAsString(8) !== PNG_SIGNATURE) throw new Error("This file is not PNG");
		
		var bin = this._binary;
		var isAnimated = false;
		var offset, length, type;
		
chunkloop:
		while(this._offset<this._binary.length){
			length = this._readAsDWord();
			type = this._readAsString(4);
			
			if(length<=0) throw new Error("This file is corrupted PNG");
			
			offset = this._offset;
			switch (type) {
				case "IHDR":
					this._headerOffset = this._offset;
					this._headerLength = length;
					this._width  = this._readAsDWord();
					this._height = this._readAsDWord();
					break;
				case "acTL":
					isAnimated = true;
					this._offset += 4;
					this._frameLength = this._readAsDWord();
					break;
				case "IEND":
					this._isEOF = true;
				case "fcTL":
					this._offset -= 8;
					break chunkloop;
				default:
					break;
			}
			
			this._offset = offset + length + 4;
		}
		
 		if (!isAnimated) throw new Error("This file is non-animated PNG");
 		
 		this._isHeaderLoaded = true;
	}
	
	function moveToFirstFrame(){
		if(!this._isHeaderLoaded) return false;
		
		this._offset = this._headerOffset + this._headerLength + 4;
		this._isEOF = false;
		
		return true;
	}
	
	function getNextFrame(){
		if(!this._isHeaderLoaded) return null;
		if(this._isEOF) return null;
		
		var bin = this._binary;
		var offset, length, type;
		var frame = null, data;
		
chunkloop:
		while(this._offset<this._binary.length){
			length = this._readAsDWord();
			type = this._readAsString(4);
			
			if(length<=0) throw new Error("This file is corrupted PNG");
			
			offset = this._offset;
			switch (type) {
				case "fcTL":
					if(frame){
						this._offset -= 8;
						break chunkloop;
					}
					this._frameCount = (this._readAsDWord()+1)>>1;
					frame = new AISplitter.APNGFrame();
					
					frame._width  = this._readAsDWord();
					frame._height = this._readAsDWord();
					frame._left   = this._readAsDWord();
					frame._top    = this._readAsDWord();
					
					var delayN = this._readAsWord();
					var delayD = this._readAsWord();
					if (delayD === 0) delayD = 100;
					var delay = 1000 * delayN / delayD;
					// see http://mxr.mozilla.org/mozilla/source/gfx/src/shared/gfxImageFrame.cpp#343
					if (delay <= 10) delay = 100;
					frame._delay = delay;
					
					this._position += delay;
					
					frame._disposeOp = this._readAsByte();
					frame._blendOp   = this._readAsByte();
					break;
				case "fdAT":
					this._offset += 4; // skip sequence number
					offset += 4;
					length -=4;
				case "IDAT":
					if(!frame) break;
					
					data = this._readAsString(length);
					break;
				case "IEND":
					this._isEOF = true;
					this._offset -= 8;
					break chunkloop;
				default:
					break;
			}
			
			this._offset = offset + length + 4;
		}
		
		if(!frame) return null;
		
		// make Image
		var db = new AISplitter.DataBuilder();
		db.append(PNG_SIGNATURE);
		var headerData = writeDWord(frame._width) + writeDWord(frame._height) + this._binary.substr(this._headerOffset,this._headerLength);
		db.append(writeChunk("IHDR",headerData));
		db.append(writeChunk("IDAT",data));
		db.append(PNG_IEND);
		
		frame._uri = db.getUrl("image/png");
		
		return frame;
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