/*jshint -W099*/

var canvas = document.getElementById('canvas');
var width = canvas.width;
var height = canvas.height;

var ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

var FORCE_TICK_TIME = false;

var GAMEWIDTH = width;
var GAMEHEIGHT = height;

var DEBUG_MODE = false;

var max = function(a, b){return (a > b) ? a : b;};
var min = function(a, b){return (a < b) ? a : b;};

var d2 = function(p1, p2){
    var x, y;
    x = p1[0] - p2[0];
    y = p1[1] - p2[1];
    return x*x + y*y;
};

window.requestAnimFrame = (function(){
    return  window.requestAnimationFrame   || 
	window.webkitRequestAnimationFrame || 
	window.mozRequestAnimationFrame    || 
	window.oRequestAnimationFrame      || 
	window.msRequestAnimationFrame     || 
	function(callback, element){
	    window.setTimeout(callback, 1000 / FPS_CAP);
	};
})();

var bindHandler = (function(){
    var FunctionGroup = function(){
	this.clear();
    };
    FunctionGroup.prototype.clear = function(){
	var oldSet = {
	    functions: this.functions,
	    flipped: this.flipped
	};
	this.functions = {'down': [],
			  'up': [],
			  'move': []};
	this.flipped = {'down': [],
			'up': [],
			'move': []};
	return oldSet;
    };
    FunctionGroup.prototype.reset = function(oldSet){
	this.functions = oldSet.functions;
	this.flipped = oldSet.flipped;
    };
    FunctionGroup.prototype.run = function(key, e){
	var anyTrue = false;
	for (var i = 0; i < this.functions[key].length; i++){
	    if (this.functions[key][i](e)){
		anyTrue = true;
	    }
	}
	return anyTrue;
    };
    FunctionGroup.prototype.flip = function(functionDict){
	if (functionDict === undefined){
	    this.functions = this.flipped;
	}
	else{
	    this.flipped = this.functions;
	    this.functions = functionDict;
	}
    };
    FunctionGroup.prototype.addFunction = function(func, event){
	this.functions[event].push(func);
	var that = this;
	return function(){
	    for (var i = 0; i < that.functions[event].length; i++){
		if (that.functions[event][i] === func){
		    that.functions[event].splice(i, 1);
		    return;
		}
	    }
	};
    };

    var alwaysFunctions = new FunctionGroup();
    var ifNothingFunctions = new FunctionGroup();

    var functionGroups = [alwaysFunctions, ifNothingFunctions];
    
    var getBindFunction = function(key){
	return function(e){
	    e.preventDefault();
	    var runNothingFunctions = !alwaysFunctions.run(key, e);
	    if (runNothingFunctions){
		ifNothingFunctions.run(key, e);
	    }
	};
    };

    canvas.addEventListener('mousedown', getBindFunction('down'), false);
    canvas.addEventListener('mouseup', getBindFunction('up'), false);
    canvas.addEventListener('mousemove', getBindFunction('move'), false);
    canvas.addEventListener('touchstart', getBindFunction('down'), false);
    canvas.addEventListener('touchend', getBindFunction('up'), false);
    canvas.addEventListener('touchmove', getBindFunction('move'), false);

    return {
	flip: function(functionDicts){
	    for (var i = 0; i < functionGroups.length; i++){
		if (functionDicts === undefined){
		    functionGroups[i].flip();
		}
		else{
		    if (functionDicts[i] === undefined){
			console.log('Warning: undefined function flip');
		    }
		    functionGroups[i].flip(functionDicts[i]);
		}
	    }
	},
	bindFunction: function(func, event, group){
	    if (!event){
		event = 'down';
	    }

	    if (group === undefined || group == 'always'){
		return alwaysFunctions.addFunction(func, event);
	    }
	    else if (group == 'ifnothing'){
		return ifNothingFunctions.addFunction(func, event);
	    }
	    else{
		console.log('Warning: wrong bind group' + func);
	    }
            return null;
	},
	clear: function(){
	    var oldSets = [];
	    for (var i = 0; i < functionGroups.length; i++){
		oldSets.push(functionGroups[i].clear());
	    }
	    return oldSets;
	},
	reset: function(oldSets){
	    /*Resets the bindings to those passed,
	      Meant to be used with the result of a clear*/
	    for (var i = 0; i < oldSets.length; i++){
		functionGroups[i].reset(oldSets[i]);
	    }
	}
    };
})();

var timeFeed = (function(){
    var lastTime = new Date();
    var startTime = new Date();
    var baseTimeFactor = 1.0;
    var timeFactor = baseTimeFactor;
    var fullTimeElapsed = 0;
    var getInterval = function(){
        var nowTime = new Date();
	var interval = (nowTime.getTime() - lastTime.getTime()) / 1000;
	interval *= timeFactor;
	lastTime = nowTime;
        fullTimeElapsed = (nowTime.getTime() - startTime.getTime()) / 1000;
        if (FORCE_TICK_TIME){
            return FORCE_TICK_TIME;
        }
        else{
            return min(interval, 1);
        }
    };
    var setPaused = function(pause){
	timeFactor = pause ? 0 : baseTimeFactor;
    };
    var setFactor = function(factor){
	baseTimeFactor = factor;
	timeFactor = (timeFactor === 0) ? 0 : baseTimeFactor;
    };
    var setStartTime = function(){
        startTime = new Date();
    };
    
    return {getInterval: getInterval,
	    setPaused: setPaused,
	    setFactor: setFactor,
            setStartTime: setStartTime,
            getFullTime: function(){
                return fullTimeElapsed;
            },
           };
})();

var containsRect = function(outer, inner){
    return outer[0] < inner[0] &&
        outer[1] < inner[1] &&
        outer[0] + outer[2] > inner[0] + inner [2] &&
        outer[1] + outer[3] > inner[1] + inner[3];
};

var collideRect = function(rct1, rct2){
    return (max(rct1[0], rct2[0]) < min(rct1[0] + rct1[2], rct2[0] + rct2[2]) &&
	    max(rct1[1], rct2[1]) < min(rct1[1] + rct1[3], rct2[1] + rct2[3]));
};

var containsPos = function(rect, pos){
    return (rect[0] < pos[0] &&
            rect[1] < pos[1] &&
            rect[0] + rect[2] > pos[0] &&
            rect[1] + rect[3] > pos[1]);
};

var getImage = (function(){
    var imageMap = {};
    return function(imageName){
        if (!imageName){
            throw "Trying to get undefined image";
        }
        var img = imageMap[imageName];
        if (img === undefined){
            img = new Image();
            img.src = 'images/' + imageName + '.png';
            imageMap[imageName] = img;
        }
        return img;
    };
}());

stylePaddingLeft = parseInt(document.defaultView.getComputedStyle(canvas, null)['paddingLeft'], 10)      || 0;
stylePaddingTop  = parseInt(document.defaultView.getComputedStyle(canvas, null)['paddingTop'], 10)       || 0;
styleBorderLeft  = parseInt(document.defaultView.getComputedStyle(canvas, null)['borderLeftWidth'], 10)  || 0;
styleBorderTop   = parseInt(document.defaultView.getComputedStyle(canvas, null)['borderTopWidth'], 10)   || 0;

var html = document.body.parentNode;
htmlTop = html.offsetTop;
htmlLeft = html.offsetLeft;

var getPos = function(e) {
    var element = canvas, offsetX = 0, offsetY = 0, mx, my;
    if (element.offsetParent !== undefined) {
	do {
	    offsetX += element.offsetLeft;
	    offsetY += element.offsetTop;
	} while ((element = element.offsetParent));
    }
    offsetX += stylePaddingLeft + styleBorderLeft + htmlLeft;
    offsetY += stylePaddingTop + styleBorderTop + htmlTop;
    mx = e.pageX - offsetX;
    my = e.pageY - offsetY;
    return [mx, my];
};

var simpleDict = function(key, val){
    var dict = {};
    dict[key] = val;
    return dict;
};

var dictFromPairs = function(pairs){
    var dict = {};
    _.each(pairs, function(pair){
        dict[pair[0]] = pair[1];
    });
    return dict;
};

var addFunction = function(a, b){
    return a + b;
};

var addDict = function(base, add){
    _.each(add, function(val, key){
        if (base[key] === undefined){
            base[key] = 0;
        }
        base[key] += val;
    });
};

var unrollDict = function(dct){
    var lst = [];
    _.each(dct, function(val, key){
        _.each(_.range(val), function(){
            lst.push(key);
        });
    });
    return lst;
};

var trueFunction = function(){ return true; };
var falseFunction = function(){ return false; };
var blankStringFunction = function(){ return ''; };
var emptyArrayFunction = function(){ return []; };
var zeroFunction = function(){ return 0; };

var incrementDict = function(dct, key, val){
    if (val === undefined){
        val = 1;
    }

    if (dct[key] === undefined){
        dct[key] = 0;
    }
    dct[key] += val;
    return dct[key];
};

var percentCheck = function(percent){
    return Math.random() * 100 < percent;
};

var ctxFillRect = function(rect){
    ctx.fillRect(rect[0], rect[1], rect[2], rect[3]);
};

var addLists = function(lst1, lst2){
    return _.map(lst1, function(ele, i){
        return ele + (lst2[i] ? lst2[i] : 0);
    });
};

var reduceArray = function(lst){
    return _.reduce(lst, function(memo, ele){
        return memo.length ? memo + ', ' + ele : ele;
    }, '');
};

var comparePos = function(pos1, pos2){
    return pos1[0] == pos2[0] && pos1[1] == pos2[1];
};

var ctxRoundedRect = function(rect){
    ctx.beginPath();
    ctx.moveTo(rect[0] + 2, rect[1]);
    ctx.lineTo(rect[0], rect[1] + 2);
    ctx.lineTo(rect[0], rect[1] + rect[3] - 2);
    ctx.lineTo(rect[0] + 2, rect[1] + rect[3]);
    ctx.lineTo(rect[0] + rect[2] - 2, rect[1] + rect[3]);
    ctx.lineTo(rect[0] + rect[2], rect[1] + rect[3] - 2);
    ctx.lineTo(rect[0] + rect[2], rect[1] + 2);
    ctx.lineTo(rect[0] + rect[2] - 2, rect[1]);
    ctx.lineTo(rect[0] + 2, rect[1]);
    ctx.stroke();
};

var scaledDraw = function(img, rect, scale){
    var newRect = [rect[0] - rect[2] * (scale - 1) / 2, rect[1] - rect[3] * (scale - 1) / 2, rect[2] * scale, rect[3] * scale];
    ctx.drawImage(img, newRect[0], newRect[1], newRect[2], newRect[3]);
};

var getFont = function(px){
    return '' + px + 'px OpenSans';
};

var clamp = function(val, mx, mn){
    return max(min(val, mx), mn);
};
