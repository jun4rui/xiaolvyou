//低版本浏览器屏蔽console.log，再也不用因为某个console.log没干掉在低版本浏览器上出问题了
(function(){
	if (typeof(console)!="object"){
		window.console = {
			log:function(inStr){
				//alert(inStr);
			}
		};
	}
})(window);