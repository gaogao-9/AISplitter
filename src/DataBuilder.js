(function(window, undef) {
	"use strict";
	
	// global set
	window.AISplitter.DataBuilder  = DataBuilder;
	
	// methods(prototype)
	DataBuilder.prototype.append = append; // (data:String):void
	DataBuilder.prototype.getURI = getURI; // (contentType:String):String
	
	function DataBuilder() {
		//see http://qiita.com/LightSpeedC/items/d307d809ecf2710bd957#%E3%81%8A%E3%81%BE%E3%81%911-new-%E3%82%92%E4%BB%98%E3%81%91%E5%BF%98%E3%82%8C%E3%81%9F%E6%99%82%E3%81%AE%E5%AF%BE%E5%BF%9C
		if (!(this instanceof DataBuilder)) {
			return new DataBuilder(arguments);
		}
		
		this._parts = [];
	}
	function append(data) {
		this._parts.push(data);
	};
	function getURI(contentType) {
		if (window.btoa) {
			return "data:" + contentType + ";base64," + btoa(this._parts.join(""));
		} else { // IE
			return "data:" + contentType + "," + escape(this._parts.join(""));
		}
	};
})((this || 0).self || global);