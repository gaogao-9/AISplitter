/*!
 * Animation Image Splitter v2.0.2 | MIT Licence | 2014 Kenta Moriuchi (@printf_moriken) | http://git.io/bSTspQ
 *
 * This Program is inspired by APNG-canvas.
 * @copyright 2011 David Mzareulyan
 * @link https://github.com/davidmz/apng-canvas
 * @license https://github.com/davidmz/apng-canvas/blob/master/LICENSE (MIT License)
 */

(function(window, undef) {
	"use strict";
	
	// global set
	window.AISplitter = AISplitter;
	
	// setter,getter
	AISplitter.prototype = {
		set path(value){
			if(typeof(value)!=="string") return;
			this._path = value.toString();
		},
		get path(){
			return this._path;
		},
		set isLoaded(value){ },
		get isLoaded(){
			return this._isLoaded;
		}
	};
	
	// methods(prototype)
	AISplitter.prototype.read        = read;        // (type:String):void
	AISplitter.prototype.readAsAPNG  = readAsAPNG;  // ():void
	AISplitter.prototype.readAsXJPEG = readAsXJPEG; // ():void
	AISplitter.prototype.on          = on;          // (type:String,callback:Function):void
	AISplitter.prototype.off         = off;         // (type:String[,callback:Function]):void
	AISplitter.prototype.trigger     = trigger;     // (type:String[,arg:Object]):void
	
	// events example reference
	//	AISplitter.on("load",function(movie){
	//		var frame = movie.getNextFrame();
	//		
	//		console.log(frame.uri); // ImageDataURI of this frame
	//		
	//		return false; // stopPropagation
	//	});
	//	AISplitter.on("error",function(err){
	//		console.log(err); //show error message
	//	});
	
	// static parameters
	AISplitter.APNG  = "APNG";
	AISplitter.XJPEG = "XJPEG";
	
	// static methods
	AISplitter._extend = _extend; // (superCtor,ctor):void
	
	// main
	function AISplitter(uri){
		//see http://qiita.com/LightSpeedC/items/d307d809ecf2710bd957#%E3%81%8A%E3%81%BE%E3%81%911-new-%E3%82%92%E4%BB%98%E3%81%91%E5%BF%98%E3%82%8C%E3%81%9F%E6%99%82%E3%81%AE%E5%AF%BE%E5%BF%9C
		if (!(this instanceof AISplitter)) {
			return new AISplitter(arguments);
		}
		
		this._path = "";
		this._isLoaded = false;
		this.events = {
			load:  [],
			error: []
		};
		
		this.path = uri;
	}
	
	function read(type){
		if(this._isLoaded) return; // prevent from duplicated loading
		switch(type){
			case AISplitter.APNG:
			case AISplitter.XJPEG:
				_urlToBinary.call(this,type);
				break;
			default:
				this.trigger("error", new Error("Don't support type"));
				break;
		}
	};
	
	function readAsAPNG(){
		return read.call(this, AISplitter.APNG);
	}
	
	function readAsXJPEG(){
		return read.call(this, AISplitter.XJPEG);
	}
	
	function on(type,callback){
		switch(type){
			case "load":
			case "error":
				this.events[type].push(callback);
				break;
			default:
				throw new Error("Don't exist '"+type+"' event");
		}
	}
	
	function off(type,callback){
		switch(type){
			case "load":
			case "error":
				if(typeof(callback)!=="function"){
					this.events[type].length = 0;
					break;
				}
				var events = this.events[type];
				for(var i=events.length;i--;){
					if(events[i]!==callback) continue;
					events.splice(i,1);
				}
				break;
			default:
				throw new Error("Don't exist '"+type+"' event");
		}
	}
	
	function trigger(type,arg){
		switch(type){
			case "load":
			case "error":
				break;
			default:
				throw new Error("Don't exist '"+type+"' event");
		}
		var events = this.events[type];
		for(var i=events.length;i--;){
			if(events[i].call(this,arg)===false) break;
		}
	}
	
	function _urlToBinary(type) {
		var _this = this;
		var xhr = new XMLHttpRequest();

		xhr.open('GET',this._path,true);
		if(useResponseType) { // XHR 2
			xhr.responseType = useResponseTypeBlob ? "blob" : "arraybuffer";
		}
		else if(useXUserDefined){ // old Safari
			xhr.overrideMimeType('text/plain; charset=x-user-defined');
		}
		
		xhr.onreadystatechange = function(e) {
			if(this.readyState !== 4) return;
			if(this.status !== 200) _this.trigger("error", new error("Can't read file"));
			
			// XHR 3
			if(!useResponseType){
				var res = "";
				if(isMSIE9){ // IE9
					var raw = IEBinaryToBinStr(this.responseBody);
					for (var i=0,iLen=raw.length;i<iLen;++i) {
						var c = raw.charCodeAt(i);
						res += String.fromCharCode(c & 0xff, (c >> 8) & 0xff);
					}
				}
				else{ // old Safari
					var binStr = this.responseText;
					for (var i=0,iLen=binStr.length;i<iLen;++i) {
						res += String.fromCharCode(binStr.charCodeAt(i) & 0xff);
					}
				}
				_this._isLoaded = true;
				_this.trigger("load",new AISplitter.Movie(res,type));
				return;
			}
			
			// XHR 2
			if(!useResponseTypeBlob){ // ArrayBuffer
				var binStr = "";
				var bytes = new Uint8Array(this.response);
				var length = bytes.byteLength;
				for (var i = 0; i < length; ++i) {
					binStr += String.fromCharCode(bytes[i]);
				}
				_this._isLoaded = true;
				_this.trigger("load",new AISplitter.Movie(binStr,type));
				return;
			}
			
			// Blob
			var reader = new FileReader();
			if(reader.readAsBinaryString !== undef) {
				reader.onload = function() {
					_this._isLoaded = true;
					_this.trigger("load",new AISplitter.Movie(this.result,type));
				};
				reader.readAsBinaryString(this.response);
				return;
			}
			
			// IE 10~
			reader.onload = function() {
				var binStr = "";
				var bytes = new Uint8Array(this.result);
				var length = bytes.byteLength;
				for (var i = 0; i < length; ++i) {
					binStr += String.fromCharCode(bytes[i]);
				}
				_this._isLoaded = true;
				_this.trigger("load",new AISplitter.Movie(binStr,type));
			};
			reader.readAsArrayBuffer(this.response);
		};
		xhr.send();
	};
	
	// see http://qiita.com/LightSpeedC/items/d307d809ecf2710bd957#%E6%AD%A3%E3%81%97%E3%81%84%E7%B6%99%E6%89%BF
	function _extend(superCtor,ctor){
		ctor.super_ = superCtor;
		ctor.prototype = Object.create(superCtor.prototype, {
			constructor: {
				value: ctor,
				enumerable: false,
				writable: true,
				configurable: true
			}
		});
	}
	
	// modernizrs
	var useResponseType, useResponseTypeBlob; // XHR 2
	var useXUserDefined; // XHR 1
	function _XHRModernizr(){
		// Modernizr https://github.com/Modernizr/Modernizr/blob/924c7611c170ef2dc502582e5079507aff61e388/src/testXhrType.js
		var xhr = new XMLHttpRequest();
		useResponseType = (xhr.responseType !== undef);
		useXUserDefined = (xhr.overrideMimeType !== undef && !useResponseType);
		
		if(!useResponseType) {
			useResponseTypeBlob = false;
			return;
		}
		
		xhr.open("get", "/", true);
		try {
			xhr.responseType = "blob";
		} catch(e) {
			useResponseTypeBlob = false;
			return;
		}
		useResponseTypeBlob = (xhr.response !== undef && xhr.responseType === "blob");
	}
	_XHRModernizr();
	
	var isMSIE9 = navigator.userAgent.match(/msie [9.]/i);
	function _BinaryStringModernizr(){
		// IE9 http://miskun.com/javascript/internet-explorer-and-binary-files-data-access/
		if(!isMSIE9) return;
		
		document.addEventListener("DOMContentLoaded", function() {
			var script = document.createElement("script");
			script.setAttribute('type', 'text/vbscript');
			script.text =
				"Function IEBinaryToBinStr(Binary)\r\n" +
				"   IEBinaryToBinStr = CStr(Binary)\r\n" +
				"End Function\r\n";
			document.body.appendChild(script);
		});
	}
	_BinaryStringModernizr();
})((this || 0).self || global);