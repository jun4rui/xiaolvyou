/**
 * Created by jun4r on 2015/9/18.
 *
 * 20160414 Change log:
 * 郑波
 * 第一种场景：
 * 销售1->销售2->普通客户   普通客户只能联系销售2
 * 第二种场景：
 * 销售1->普通客户1->普通客户2   普通客户2只能联系销售1
 * 曹熙：普通用户再下次进去首页立刻清空销售人员信息
 */
var server_addr = 'http://www.xiaolvyou.com.cn';						//JSON接口服务器地址，调用接口时用，方便更换
//var server_addr = 'http://www.96hn.com';						//JSON接口服务器地址，调用接口时用，方便更换


//20160419 旧的销售人员逻辑用数据，即将取消
var _INFODATA	= window.localStorage.getItem('INFO_DATA');		//_INFODATA变量保存销售人员信息用，保存在localStorage中
var _INFOID		= '';											//_INFOID表示销售人员的系统内部ID编号
if (_INFODATA!=null){
	if (_INFODATA.indexOf(',')>-1){
		_INFOID 	= _INFODATA.split(',')[3];
	}
}
var _USERDATA	= JSON.parse(window.localStorage.getItem('USER_DATA'));		//_USERDATA变量保存用户信息




//20160419 新的销售人员逻辑用数据
var _EMPLOYEE_DATA = window.localStorage.getItem('EMPLOYEE_DATA');	//员工数据
var _SELLER_DATA   = window.localStorage.getItem('SELLER_DATA');	//销售数据

//20160612 根据郑波要求的“如果没有销售人员也需要显示华天国旅的默认销售面板信息”，所以将默认值修改为华天旅游网的默认信息
var _SHOW_DATA     = '华天国旅,073155555555,http://www.htyou.com/weixin_h5/images/default_face.png,0' //显示数据，该数据用来显示销售员面板和分享者ID，默认为空，待根据算法赋予其值

//查询url参数函数
//有则返回参数列表list
//没有则返回空串
function getParameters(inUrl/*完整的URL字符串*/){
	//url中有?号才继续
	if (inUrl.indexOf('\?')>=0){
		return inUrl.substring(inUrl.indexOf('?')+1).split('&');    //有则返回所有参数的list
	}else{
		return '';  //没有则返回''
	}
}

//获得url中某个参数的值
//有则返回参数的值
//没有则返回空串
function getParameterValue(inUrl/*输入Url*/, inName/*参数名*/){
	var paraList = getParameters(inUrl);
	for (var i=0; i<paraList.length; i++){
		//如果没有'='则跳过
		if (paraList[i].indexOf('=')<0){
			continue;
		}
		//如果参数名=inName则返回参数值
		var tempVal = paraList[i].split('=');
		if (tempVal[0]==inName){
			return tempVal[1];
		}
	}
	return '';
}
//TEST: getParameterValue('http://www.htyou.com/index.html?q=北京&asdf=123&zxcv=123&a=fasdf','q');

//底部上划载入特效
function slide(hrf){
	var options = {
		"href"           : hrf,
		"direction"      : "up", // 'left|right|up|down', default 'left' (which is like 'next')
		"duration"       :  1000, // in milliseconds (ms), default 400
		"slowdownfactor" :    4, // overlap views (higher number is more) or no overlap (1), default 3
		"iosdelay"       :  100, // ms to wait for the iOS webview to update before animation kicks in, default 50
		"androiddelay"   :  50  // same as above but for Android, default 50
	};
	window.plugins.nativepagetransitions.slide(
		options,
		function (msg) {console.log("success: "+msg)}, // called when the animation has finished
		function (msg) {alert("error: "+msg)} // called in case you pass in weird values
	);
}

//翻转载入动画特效
function flip(href) {
	window.plugins.nativepagetransitions.flip({
		'duration': 1000,
		'direction': 'right',
		'iosdelay': 100,
		'androiddelay': 50,
		'winphonedelay': 800,
		'href': href
	});
}

//设置返回链接
function setBack(inSelecter){
	$(inSelecter).attr('href',document.referrer);
}
//执行返回
function doBack(){
	/*window.location.href= document.referrer;*/
	var pathLog     = window.localStorage.getItem('PATH_LOG');
	var lastPath    = pathLog.split(',')[pathLog.split(',').length-1];  //最后一条记录的URL
	//如果当前页面在队列末尾，则删除当前页
	if (lastPath==window.location.href){
		window.localStorage.setItem('PATH_LOG',pathLog.substring(0,pathLog.lastIndexOf(',')));
		lastPath    = window.localStorage.getItem('PATH_LOG').split(',')[window.localStorage.getItem('PATH_LOG').split(',').length-1];
	}
	window.location.href = lastPath;
}

//需要JQuery，匿名自执行函数，用来控制历史纪录
(function(){
	//到首页后将清空路径记录（考虑首页没有回退，而且首页作为起点）
	if (window.location.href.indexOf('main.html')!=-1){
		window.localStorage.setItem('PATH_LOG','');
	}
	//如果没有PATH_LOG则初始化
	if ( window.localStorage.getItem('PATH_LOG')==null){
		window.localStorage.setItem('PATH_LOG','');
	}
	//console.log('[Path log START]')
	var pathLog     = window.localStorage.getItem('PATH_LOG');
	var lastPath    = pathLog.split(',')[pathLog.split(',').length-1];  //最后一条记录的URL
	//如果最后一条记录不是自己，就把自己加到队列末尾
	if (window.location.href != lastPath){
		window.localStorage.setItem( 'PATH_LOG',pathLog+','+window.location.href);
	}
	//后台打印路径记录
	/*var pathList    =  window.localStorage.getItem('PATH_LOG').split(',');
	 //alert(pathList+'\n'+document.referrer+'\n'+window.location.href);
	 for (var i in pathList){
	 console.log(pathList[i]);
	 }*/
})();



//Caojun 20160108 新增:销售人员信息读取函数
//销售人员根据url中infoid=???参数进行识别,???代表销售人员的ID编号，通过接口
//http://www.htyou.com/common/websinfo_queryWebsInfos.action?submit=ajax&infoID=431
//http://www.htyou.com/common/websinfo_queryWebsInfos.action?url=oiZKXjjxNP3iA6iUfgkVo6H7sdmU&submit=ajax
//获取，返回值为json格式，销售人员返回值中必须是"info_class": 421
//INFO_DATA格式：姓名,电话,头像url,存储时间
(function () {
	var sellerID   = getParameterValue(window.location.href, 'infoid');	//从微信分享链接进来的销售人员ID【数字】
	var employeeID = getParameterValue(window.location.href, 'url');	//从微信进来的员工ID【不规则长字符串】

	//是否url带有销售人员的sellerID进来
	//TEST: ?url=oiZKXjjPYlSmiN3yndvDLZ7-E-jA
	//用userID的情况
	if (employeeID != '') {
		$.getJSON(server_addr + '/common/websinfo_queryWebsInfos.action?submit=ajax&jsoncallback=?&url=' + employeeID, function (result) {
			//是否找到销售人员
			if (result.length != 0) {
				//判断是否是销售人员类型
				if (result[0].info_class == '421') {
					console.log(result[0]);
					//保存到localStorage中的INFO_DATA中
					window.localStorage.setItem('EMPLOYEE_DATA', '' + result[0].info_name + ',' + result[0].description + ',' + 'http://www.htyou.com/' + result[0].info_thumbpic + ',' + result[0].info_id);
					//将数据存储到_EMPLOYEE_DATA变量中
					_EMPLOYEE_DATA = window.localStorage.getItem('EMPLOYEE_DATA');
				}
			}else{	//20160526 郑波自己修改了数据库数据让自己身份变更，这样结果就取不到数据，但还是出现他以前销售员信息的显示，针对此问题，如果碰到数据为空，将清除掉localstorage中的销售员信息
				window.localStorage.removeItem('EMPLOYEE_DATA');
			}
		});
	}
	//TEST: ?lineid=11362&infoid=431
	if (sellerID != '') {
		//根据sellerID读取销售人员信息
		$.getJSON(server_addr + '/common/websinfo_queryWebsInfos.action?submit=ajax&jsoncallback=?&infoID=' + sellerID, function (result) {
			//是否找到销售人员
			if (result.length != 0) {
				//判断是否是销售人员类型
				if (result[0].info_class == '421') {
					console.log(result[0]);
					//保存到localStorage中的SELLER_DATA中
					window.localStorage.setItem('SELLER_DATA', '' + result[0].info_name + ',' + result[0].description + ',' + 'http://www.htyou.com/' + result[0].info_thumbpic + ',' + result[0].info_id);
					//将数据存储到_SELLER_DATA变量中
					_SELLER_DATA = window.localStorage.getItem('SELLER_DATA');
				}
			}
		});
	}
})(window);
/*20160419 大幅度修改销售模式，注释老代码*/
// (function(){
// 	var infoID  = getParameterValue(window.location.href,'infoid');
// 	var userID  = getParameterValue(window.location.href,'url');
//
// 	//展现销售人员UI的函数
// 	function showSellerUI(){
// 		var infoData= '';
// 		//读取localStorage中的INFO_DATA数据
// 		if ((infoData = window.localStorage.getItem('INFO_DATA'))!=null){
// 			//console.log(infoData);
// 			//如果保存时间太久超过24小时则摧毁INFO_DATA，否则显示销售员信息
// 			if(((new Date).getTime()-infoData.split(',')[4])>86400000){
// 				//console.log((new Date).getTime()-parseInt(infoData.split(',')[3]));
// 				window.localStorage.removeItem('INFO_DATA');
// 			}else{
// 				$(document).ready(function(){
// 					//线路详情页面的处理方式
// 					if (window.location.href.indexOf('tour-detail.html')>-1){
// 						$('#btn-style-2 .face').css({'background':'url('+infoData.split(',')[2]+') 50% 50% no-repeat','background-size':'cover'});
// 						$('#btn-style-2 a').attr('href','tel:'+infoData.split(',')[1]);
// 						$('#btn-style-1').hide();
// 						$('#btn-style-2').show();
// 						return true;
// 					}
// 					//首页的处理方式
// 					if (window.location.href.indexOf('main.html')>-1){
// 						$('#seller-panel').height(parseInt($(window).width()/1000*657));
// 						$('#seller-panel .seller-panel-bg').height(parseInt($(window).width()/1000*657));
// 						//$('#seller-panel .seller-panel-bg').css({'background':'url('+infoData.split(',')[2]+') 50% 50% no-repeat','background-size':'cover'});
// 						$('#seller-panel .seller-panel-bg').css({'background':'url(http://www.htyou.com/pic/adpic/2014-08-28_16-45-21_5192.jpg) 50% 50% no-repeat','background-size':'cover'});
// 						$('#seller-panel img').attr({'src':''+infoData.split(',')[2]});
// 						$('#seller-panel a').attr({'href':'tel:'+infoData.split(',')[1]});
// 						$('#seller-panel a span').text(infoData.split(',')[0]);
// 						$('#galleryAD').hide();
// 						$('#seller-panel').show();
// 						return true;
// 					}
// 					//一般的处理方式
// 					$('body').append('<div id="seller-section"></div>');
// 					$('#seller-section').load('seller.html',function(){
// 						$('#seller .face').css({'background':'url('+infoData.split(',')[2]+') 50% 0% no-repeat'});
// 						$('#seller .content strong').text(infoData.split(',')[0]);
// 						$('#seller .content a').attr('href','tel:'+infoData.split(',')[1]);
// 						$('#seller').animate({'left':'1rem','bottom:':'1rem'});
// 					});
// 				});
// 			}
// 		}
// 	}
//
// 	//有infoID或者userID的处理流程，因为是ajax异步处理数据，所以两种情况作单独处理
// 	if (infoID != '' || userID != '') {
// 		//用infoID的情况
// 		if (infoID != '') {
// 			$.getJSON(server_addr+'/common/websinfo_queryWebsInfos.action?submit=ajax&jsoncallback=?&infoID=' + infoID, function (result) {
// 				//是否找到销售人员
// 				if (result.length != 0) {
// 					//判断是否是销售人员类型
// 					if (result[0].info_class == '421') {
// 						console.log(result[0]);
// 						//保存到localStorage中的INFO_DATA中
// 						window.localStorage.setItem('INFO_DATA', '' + result[0].info_name + ',' + result[0].description + ',' + 'http://www.htyou.com/' + result[0].info_thumbpic+','+result[0].info_id+','+(new Date).getTime());
// 					}
// 				}
// 				//然后在当前页面加入销售人员UI效果
// 				showSellerUI();
// 			});
// 		}
// 		//用userID的情况
// 		if (userID != '') {
// 			$.getJSON(server_addr+'/common/websinfo_queryWebsInfos.action?submit=ajax&jsoncallback=?&url=' + userID, function (result) {
// 				//是否找到销售人员
// 				if (result.length != 0) {
// 					//判断是否是销售人员类型
// 					if (result[0].info_class == '421') {
// 						console.log(result[0]);
// 						//保存到localStorage中的INFO_DATA中
// 						window.localStorage.setItem('INFO_DATA', '' + result[0].info_name + ',' + result[0].description + ',' + 'http://www.htyou.com/' + result[0].info_thumbpic+','+result[0].info_id+','+(new Date).getTime());
// 					}
// 				}
// 				//然后在当前页面加入销售人员UI效果
// 				showSellerUI();
// 			});
// 		}
//
// 	}else{
// 		//没有则直接展示销售UI(localStorage中有数据才会展示)
// 		showSellerUI();
// 	}
// })(window);





//判断页面处于何种浏览器框架下
//包括:weixin,cordova,browser
function whereami(){
	var userAgent   = navigator.userAgent.toLowerCase();
	//微信
	if (userAgent.match(/micromessenger/i)=='micromessenger')
		return 'weixin';
	//Cordova
	if (userAgent.match(/Crosswalk/i)=='crosswalk')
		return 'cordova';
	return 'other'
}
//alert(navigator.userAgent);


// 配置jquery,requirejs语法
if (typeof(avalone)=='function') {
	avalon.config({
		paths: {
			/*jquery: '../jquery/dist/jquery.min.js',*/
			/*config: '../../config.js',*/
			wx: 'http://res.wx.qq.com/open/js/jweixin-1.0.0.js'
		}
	});
}


// 判断用户设备类型
function deviceType(){
	//var info = window.navigator;
	var platform	= navigator.platform.toLowerCase();
	var useragent	= navigator.userAgent.toLowerCase();

	//是Windows的判断
	if (platform.indexOf('win32')>-1){
		return "Windows";
	}
	//是Android的判断
	if (platform.indexOf('linux')>-1 && useragent.indexOf('android')){
		return "Android";
	}
	//是iPhone的判断
	if (useragent.indexOf('iphone')>-1){
		return "iPhone";
	}
	//是iPad的判断
	if (useragent.indexOf('ipad')>-1){
		return "iPad";
	}

	//其它设备返回Ohter
	return "Other";
}

//20160530 因为在微信上突然出现找不到函数deviceType的BUG，考虑尝试将该函数添加到window中调用。故做如下代码
(function(window){
	function deviceType4Window(){
		//var info = window.navigator;
		var platform	= navigator.platform.toLowerCase();
		var useragent	= navigator.userAgent.toLowerCase();

		//是Windows的判断
		if (platform.indexOf('win32')>-1){
			return "Windows";
		}
		//是Android的判断
		if (platform.indexOf('linux')>-1 && useragent.indexOf('android')){
			return "Android";
		}
		//是iPhone的判断
		if (useragent.indexOf('iphone')>-1){
			return "iPhone";
		}
		//是iPad的判断
		if (useragent.indexOf('ipad')>-1){
			return "iPad";
		}

		//其它设备返回Ohter
		return "Other";
	}
	window.dType = deviceType4Window;
})(window);

//20160311 用户从微信登录的相关功能
//逻辑：如果用户是微信登录，则在index.html就会跳转到微信授权页面，授权完毕以后会跳转到main.html并传送openid和accesstoken两个参数，需要用这两个参数获取用户信息并保存到localStorage中。
//功能：如果在main.html页面发现附带有参数：openid和accesstoken，则调用接口获取用户信息并保存到localStorage中
//20160314 曹熙又变了，现在这个接口要用id来取
(function(window){
	if (window.location.href.indexOf('main.html')>-1 || window.location.href.indexOf('user-info.html')>-1){
		//如果参数中有from=表示是从微信中分享过来的，这样的情况不重新保存用户信息到USER_DATA;
		if (getParameterValue(window.location.href, 'from')!=''){
			return false;
		}
		var userid      = getParameterValue(window.location.href, 'id');
		//userid必须有，并且不为空才能调用接口获取用户数据
		if (userid!=''){
			$.getJSON(server_addr+'/user/htuser_getGuestsInfoById.action?userid='+userid, function (result) {
				//从接口获得的用户数据保存到localStorage中
				window.localStorage.setItem('USER_DATA', JSON.stringify(result.guestVO));
			});
		}
	}
})(window);


//展示销售面板的函数，参数是_SHOW_DATA
//展现销售人员UI的函数
function showSellerUI(inDATA) {
	//线路详情页面的处理方式
	if (window.location.href.indexOf('tour-detail.html') > -1) {
		$('#btn-style-2 .face').css({
			'background':      'url(' + inDATA.split(',')[2] + ') 50% 50% no-repeat',
			'background-size': 'cover'
		});
		$('#btn-style-2 a').attr('href', 'tel:' + inDATA.split(',')[1]);
		$('#btn-style-1').hide();
		$('#btn-style-2').show();
		return true;
	}
	//首页的处理方式
	if (window.location.href.indexOf('main.html') > -1) {
		//20160606 郑波要求无销售信息则默认显示华天国旅的漂浮信息，所以首页判断如果_SHOW_DATA的开始不是'华天国旅'则才显示顶部信息并推出，是则继续走到下一步显示漂浮信息
		if(inDATA.indexOf('华天国旅')!=0){
			$('#seller-panel').height(parseInt($(window).width() / 1000 * 657));
			$('#seller-panel .seller-panel-bg').height(parseInt($(window).width() / 1000 * 657));
			//$('#seller-panel .seller-panel-bg').css({'background':'url('+inDATA.split(',')[2]+') 50% 50% no-repeat','background-size':'cover'});
			$('#seller-panel .seller-panel-bg').css({
				'background':      'url(http://www.htyou.com/pic/adpic/2014-08-28_16-45-21_5192.jpg) 50% 50% no-repeat',
				'background-size': 'cover'
			});
			$('#seller-panel img').attr({'src': '' + inDATA.split(',')[2]});
			$('#seller-panel a').attr({'href': 'tel:' + inDATA.split(',')[1]});
			$('#seller-panel a span').text(inDATA.split(',')[0]);
			$('#galleryAD').hide();
			$('#seller-panel').show();
			return true;
		}
	}
	//一般的处理方式
	$('body').append('<div id="seller-section"></div>');
	$('#seller-section').load('seller.html', function () {
		//20160612 根据郑波的要求在华天国旅默认下才显示在线客服
		if(inDATA.indexOf('华天国旅')!=0){
			$('#seller .content a').eq(1).remove();
		}
		$('#seller .face').css({'background': 'url(' + inDATA.split(',')[2] + ') 50% 0% no-repeat','background-size':'cover'});
		$('#seller .content strong').text(inDATA.split(',')[0]);
		$('#seller .content a').eq(0).attr('href', 'tel:' + inDATA.split(',')[1]);
		$('#seller').animate({'left': '1rem', 'bottom:': '2rem'});
	});
}
$(document).ready(function(){
	//页面载入后延迟3000ms再读取销售、员工数据，保证异步载入数据已处理完毕
	setTimeout(function(){
		_EMPLOYEE_DATA = window.localStorage.getItem('EMPLOYEE_DATA');	//员工数据
		_SELLER_DATA   = window.localStorage.getItem('SELLER_DATA');	//销售数据
		console.log('_EMPLOYEE_DATA:'+_EMPLOYEE_DATA);
		console.log('_SELLER_DATA:'+_SELLER_DATA);
		//先将销售员DATA复制给展示DATA，再把员工DATA赋值给展示DATA，保证员工DATA有最高的优先级
		if (_SELLER_DATA!=null){
			_SHOW_DATA = _SELLER_DATA;
		}
		if (_EMPLOYEE_DATA!=null){
			_SHOW_DATA = _EMPLOYEE_DATA;
		}
		//如果最后展示DATA还是null，则表示不用展示，下面将做处理
		console.log('_SHOW_DATA:'+_SHOW_DATA);
		if (_SHOW_DATA!=null && _SHOW_DATA!=''){
			showSellerUI(_SHOW_DATA);
		}
		// 20160201 新版微信JS-SDK接口调用
		if (whereami() == 'weixin') {
			/*alert('http://www.htyou.com/weixin/getJsConfig.action?page_url='+window.location.href);*/
			//设置分享ID
			var shareID = '';
			if (_SHOW_DATA != null && _SHOW_DATA != '') {
				shareID = _SHOW_DATA.split(',')[3];
			}
			require(['wx'], function (wx) {
				//alert('4');
				$.getJSON(server_addr+'/weixin/getJsConfig.action?jsoncallback=?&page_url=' + window.location.href, function (result) {
					//alert(result.timestamp+'\n'+result.appId+'\n'+result.noncestr+'\n'+result.url+'\n'+result.signature);
					wx.config({
						debug: false, // 开启调试模式,调用的所有api的返回值会在客户端alert出来，若要查看传入的参数，可以在pc端打开，参数信息会通过log打出，仅在pc端时才会打印。
						appId: result.appId, // 必填，公众号的唯一标识
						timestamp: result.timestamp, // 必填，生成签名的时间戳
						nonceStr: result.noncestr, // 必填，生成签名的随机串
						signature: result.signature,// 必填，签名，见附录1
						jsApiList: [
							'checkJsApi',
							'onMenuShareTimeline',
							'onMenuShareAppMessage',
							'onMenuShareQQ',
							'onMenuShareWeibo',
							'onMenuShareQZone',
							'hideMenuItems',
							'showMenuItems',
							'hideAllNonBaseMenuItem',
							'showAllNonBaseMenuItem',
							'translateVoice',
							'startRecord',
							'stopRecord',
							'onVoiceRecordEnd',
							'playVoice',
							'onVoicePlayEnd',
							'pauseVoice',
							'stopVoice',
							'uploadVoice',
							'downloadVoice',
							'chooseImage',
							'previewImage',
							'uploadImage',
							'downloadImage',
							'getNetworkType',
							'openLocation',
							'getLocation',
							'hideOptionMenu',
							'showOptionMenu',
							'closeWindow',
							'scanQRCode',
							'chooseWXPay',
							'openProductSpecificView',
							'addCard',
							'chooseCard',
							'openCard'
						] // 必填，需要使用的JS接口列表，所有JS接口列表见附录2
					});
					wx.ready(function () {
						var title = result.guestVO.guestName+'分享给你'+$('title').text();
						var desc = $('title').text();
						var link = window.location.href;
						var imgUrl = $('body img').eq(0).attr('src');
						if (link.indexOf('?')){
							link = link+'&sellerid='+(window.localStorage.getItem('XLY_USERID')||0);
						}else{
							link = link+'?sellerid='+(window.localStorage.getItem('XLY_USERID')||0);
						}
						console.log(title+','+desc+','+link+','+imgUrl);
						//分享到朋友圈
						wx.onMenuShareTimeline({
							title: title,
							link: link,
							imgUrl: imgUrl,
							success: function () {
								alert('感谢您的分享');
							},
							cancel: function () {
								alert('欢迎您下次再进行分享');
							}
						});
						//分享给朋友
						wx.onMenuShareAppMessage({
							title: title,	// 分享标题
							desc: desc,		// 分享描述
							link: link,		// 分享链接
							imgUrl: imgUrl,	// 分享图标
							type: 'link',	// 分享类型,music、video或link，不填默认为link
							dataUrl: '',	// 如果type是music或video，则要提供数据链接，默认为空
							success: function () {
								alert('感谢您的分享');
							},
							cancel: function () {
								alert('欢迎您下次再进行分享');
							}
						});
						//分享到QQ
						wx.onMenuShareQQ({
							title: title,	// 分享标题
							desc: desc,		// 分享描述
							link: link,		// 分享链接
							imgUrl: imgUrl,	// 分享图标
							success: function () {
								alert('感谢您的分享');
							},
							cancel: function () {
								alert('欢迎您下次再进行分享');
							}
						});
						//分享到腾讯微博
						wx.onMenuShareWeibo({
							title: title,	// 分享标题
							desc: desc,		// 分享描述
							link: link,		// 分享链接
							imgUrl: imgUrl,	// 分享图标
							success: function () {
								alert('感谢您的分享');
							},
							cancel: function () {
								alert('欢迎您下次再进行分享');
							}
						});
						//分享到QQ空间
						wx.onMenuShareQZone({
							title: title,	// 分享标题
							desc: desc,		// 分享描述
							link: link,		// 分享链接
							imgUrl: imgUrl,	// 分享图标
							success: function () {
								alert('感谢您的分享');
							},
							cancel: function () {
								alert('欢迎您下次再进行分享');
							}
						});
					});
				});
			});
		}
	},0);
});
// $.getJSON('/user/htuser_getGuestsInfoById.action?userid=626685', function (result) {
// 	//从接口获得的用户数据保存到localStorage中
// 	console.log(result.guse);
// });



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


/**
 * 2016-06-22
 * 小驴友项目用js代码起始段
 */

// 将userid更新保存到localStorage中去
var userid = getParameterValue(window.location.href,'userid');
if (userid!=''){
	window.localStorage.setItem('XLY_USERID',userid);
}