(function(window, undef) {
	"use strict";
	
	// global set
	window.AISplitter.Frame = Frame;
	
	// setter,getter
	Frame.prototype = {
		set width(value){ },
		get width(){
			return this._width;
		},
		set height(value){ },
		get height(){
			return this._height;
		},
		set left(value){ },
		get left(){
			return this._left;
		},
		set top(value){ },
		get top(){
			return this._top;
		},
		set delay(value){ },
		get delay(){
			return this._delay;
		},
		set uri(value){ },
		get uri(){
			return this._uri;
		}
	};
	
	// Frame main
	function Frame(bin,type) {
		//see http://qiita.com/LightSpeedC/items/d307d809ecf2710bd957#%E3%81%8A%E3%81%BE%E3%81%911-new-%E3%82%92%E4%BB%98%E3%81%91%E5%BF%98%E3%82%8C%E3%81%9F%E6%99%82%E3%81%AE%E5%AF%BE%E5%BF%9C
		if (!(this instanceof Frame)) {
			return new Frame(arguments);
		}
		
		this._width  = 0;
		this._height = 0;
		this._left   = bin;
		this._top    = 0;
		this._delay  = 0;
		this._uri    = null;
	}
})((this || 0).self || global);