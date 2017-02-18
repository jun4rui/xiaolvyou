/**
 * Created by cao on 2017/2/18.
 */
requirejs.config({
	urlArgs: 'version='+(new Date()).getTime(),
	baseUrl: './node_modules',	//如果用data-main方式载入，则baseUrl会被替换成entryPoint也就是网页所在路径，会导致此方式失效
	paths: {
		jquery: 'jquery/dist/jquery.min',
		bootstrap: 'bootstrap/dist/js/bootstrap'
	},
	map: {
		'*': {
			'css':'require-css/css.min'
		}
	},
	shim: {
		bootstrap: {
			deps: ['css!../node_modules/bootstrap/dist/css/bootstrap.css']
		}
	}
});