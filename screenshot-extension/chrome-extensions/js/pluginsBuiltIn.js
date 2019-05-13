var defaultPlugins = [
{
		name: 'Save To Disk',
		key: 'save',
		dataType: 'image',
    editorDefault: true,
		onclick: function(scope) {
			String.prototype.twoDigits=function () {return this.replace(/^(.)$/,'0$1')};
			var x = scope.image_blob();
			var url=URL.createObjectURL(x);
			var filename;
			filename=scope.page_title || scope.page_url;
			filename=filename.replace(/[%&\(\)\\\/\:\*\?\"\<\>\|\/\]]/g,' ');
			//filename+='-' + (new Date).getHours().toString().twoDigits() + (new Date).getMinutes().toString().twoDigits() + (new Date).getSeconds().toString().twoDigits()
			// filename+=localStorage['pngjpg']=='png' ? '.png' : '.jpg';
			filename+= '.png' ;
			var evt = document.createEvent("MouseEvents");evt.initMouseEvent("click", true, true, window,0, 0, 0, 0, 0, false, true, false, false, 0, null);
			var a=$('<a></a>').appendTo(document.body);
			a.attr({'href':url,'download':filename})[0].dispatchEvent(evt)
		}
	},
{
		name: 'export',
		key: 'export',
		dataType: 'image',
		url: "http://localhost:9000/test?url=%s"
	}
]