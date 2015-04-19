(function(window, undef) {
	"use strict";
	
	// using
	var Frame = AISplitter.Frame;
	
	// global set
	window.AISplitter.XJPEGFrame  = XJPEGFrame;
	
	// extend
	AISplitter._extend(AISplitter.Frame,AISplitter.XJPEGFrame);
	
	// main
	function XJPEGFrame(bin){
		//see http://qiita.com/LightSpeedC/items/d307d809ecf2710bd957#%E3%81%8A%E3%81%BE%E3%81%911-new-%E3%82%92%E4%BB%98%E3%81%91%E5%BF%98%E3%82%8C%E3%81%9F%E6%99%82%E3%81%AE%E5%AF%BE%E5%BF%9C
		if (!(this instanceof XJPEGFrame)) {
			return new XJPEGFrame(arguments);
		}
		
		// call of base constructor
		Frame.call(this,bin);
	}
})((this || 0).self || global);