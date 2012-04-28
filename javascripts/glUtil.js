/* 
 * glutil.js - Utility functions to simplify common tasks
 */
 
/*
 * Copyright (c) 2009 Brandon Jones
 *
 * This software is provided 'as-is', without any express or implied
 * warranty. In no event will the authors be held liable for any damages
 * arising from the use of this software.
 *
 * Permission is granted to anyone to use this software for any purpose,
 * including commercial applications, and to alter it and redistribute it
 * freely, subject to the following restrictions:
 *
 *    1. The origin of this software must not be misrepresented; you must not
 *    claim that you wrote the original software. If you use this software
 *    in a product, an acknowledgment in the product documentation would be
 *    appreciated but is not required.
 *
 *    2. Altered source versions must be plainly marked as such, and must not
 *    be misrepresented as being the original software.
 *
 *    3. This notice may not be removed or altered from any source
 *    distribution.
 */

/*
 * Utility Functions
 */
 
function loadResource(url, callback) {
	var request = new XMLHttpRequest();

	request.onreadystatechange = function () {
		if (request.readyState == 4 && request.status == 200) {
		  callback(request);
		}
	};
	request.open('GET', url, true);
	request.overrideMimeType('text/plain');
	request.setRequestHeader('Content-Type', 'text/plain');
	request.send(null);

	return request;
}

function getAvailableContext(canvas, contextList) {
	if (canvas.getContext) {
		for(var i = 0; i < contextList.length; ++i) {
			try {
				var context = canvas.getContext(contextList[i]);
				if(context != null) {
				  return extendContext(context);
				}
			} catch(ex) { }
		}
	}
	return null;
}

function extendContext(gl) {
  gl.getShader = function (id) {
  	var shaderScript = document.getElementById(id);
  	if (!shaderScript)
  		return null;

  	var str = '';
  	var k = shaderScript.firstChild;
  	while (k) {
  		if (k.nodeType == 3)
  			str += k.textContent;
  		k = k.nextSibling;
  	}

  	var shader;
  	if (shaderScript.type == 'x-shader/x-fragment') {
  		shader = gl.createShader(gl.FRAGMENT_SHADER);
  	} else if (shaderScript.type == 'x-shader/x-vertex') {
  		shader = gl.createShader(gl.VERTEX_SHADER);
  	} else {
  		return null;
  	}

  	gl.shaderSource(shader, str);
  	gl.compileShader(shader);

  	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
  		console.debug(gl.getShaderInfoLog(shader));
  		gl.deleteShader(shader);
  		return null;
  	}

  	return shader;
  }

  gl.createShaderProgram = function (vertexSrc, fragmentSrc) {
  	var fragmentShader = gl.getShader(vertexSrc);
  	var vertexShader = gl.getShader(fragmentSrc);

  	var shaderProgram = gl.createProgram();
  	gl.attachShader(shaderProgram, vertexShader);
  	gl.attachShader(shaderProgram, fragmentShader);
  	gl.linkProgram(shaderProgram);

  	if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
  		gl.deleteProgram(shaderProgram);
  		gl.deleteShader(vertexShader);
  		gl.deleteShader(fragmentShader);
  		console.debug('Could not initialise shaders');
  		return null;
  	}

  	gl.useProgram(shaderProgram);

  	shaderProgram.attribute = {};

  	shaderProgram.attribute.position = gl.getAttribLocation(shaderProgram, 'position');
  	shaderProgram.attribute.normal = gl.getAttribLocation(shaderProgram, 'normal');
  	shaderProgram.attribute.texCoord = gl.getAttribLocation(shaderProgram, 'texCoord');
  	shaderProgram.attribute.texCoord2 = gl.getAttribLocation(shaderProgram, 'texCoord2');
  	shaderProgram.attribute.tangent = gl.getAttribLocation(shaderProgram, 'tangent');
  	shaderProgram.attribute.color = gl.getAttribLocation(shaderProgram, 'color');

  	shaderProgram.uniform = {};

  	shaderProgram.uniform.time = gl.getUniformLocation(shaderProgram, 'time');
  	shaderProgram.uniform.turbFactor = gl.getUniformLocation(shaderProgram, 'turbFactor');
  	shaderProgram.uniform.turbTime = gl.getUniformLocation(shaderProgram, 'turbTime');

  	shaderProgram.uniform.modelViewMat = gl.getUniformLocation(shaderProgram, 'modelViewMat');
  	shaderProgram.uniform.projectionMat = gl.getUniformLocation(shaderProgram, 'projectionMat');
  	shaderProgram.uniform.modelViewInvMat = gl.getUniformLocation(shaderProgram, 'modelViewInvMat');
  	shaderProgram.uniform.texMat = gl.getUniformLocation(shaderProgram, 'texMat');

  	shaderProgram.uniform.ambientLight = gl.getUniformLocation(shaderProgram, 'ambientLight');
  	shaderProgram.uniform.lightPos = gl.getUniformLocation(shaderProgram, 'lightPos');
  	shaderProgram.uniform.lightColor = gl.getUniformLocation(shaderProgram, 'lightColor');
  	shaderProgram.uniform.specularColor = gl.getUniformLocation(shaderProgram, 'specularColor');
  	shaderProgram.uniform.shininess = gl.getUniformLocation(shaderProgram, 'shininess');

  	shaderProgram.uniform.diffuse = gl.getUniformLocation(shaderProgram, 'diffuse');
  	shaderProgram.uniform.lightmap = gl.getUniformLocation(shaderProgram, 'lightmap');
  	shaderProgram.uniform.specular = gl.getUniformLocation(shaderProgram, 'specular');
  	shaderProgram.uniform.normalMap = gl.getUniformLocation(shaderProgram, 'normalMap');

  	return shaderProgram;
  }

  gl.createSolidTexture = function (color) {
  	var data = new Uint8Array(color);
  	var texture = gl.createTexture();
  	gl.bindTexture(gl.TEXTURE_2D, texture);
  	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 1, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, data);
  	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  	return texture;
  }

  gl.loadTexture = function (src) {
  	var texture = gl.createTexture();
  	var image = new Image();
  	image.onload = function() {
  		gl.bindTexture(gl.TEXTURE_2D, texture);
  		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
  		gl.generateMipmap(gl.TEXTURE_2D);
  	}
  	image.src = src;
  	return texture;
  }

  return gl;
}


// Set up event handling
function initEvents() {
	var movingModel = false;
	var lastX = 0;
	var lastY = 0;
	
	$('#viewport').mousedown(function (event) {
		if(event.which == 1) {
			movingModel = true;
		}
		lastX = event.pageX;
		lastY = event.pageY;
	});
	
	$('#viewport').mousemove(function (event) {
		var xDelta = event.pageX  - lastX;
		var yDelta = event.pageY  - lastY;
		lastX = event.pageX;
		lastY = event.pageY;
		
		if (movingModel) {
			zAngle += xDelta*0.025;
			while (zAngle < 0)
				zAngle += Math.PI*2;
			while (zAngle >= Math.PI*2)
				zAngle -= Math.PI*2;
				
			xAngle += yDelta*0.025;
			while (xAngle < 0)
				xAngle += Math.PI*2;
			while (xAngle >= Math.PI*2)
				xAngle -= Math.PI*2;
		}
	});
	
	$('#viewport').mouseup(function (event) {
		movingModel = false;
	});
}

// shim layer with setTimeout fallback
window.requestAnimFrame = (function () {
  return  window.requestAnimationFrame       || 
          window.webkitRequestAnimationFrame || 
          window.mozRequestAnimationFrame    || 
          window.oRequestAnimationFrame      || 
          window.msRequestAnimationFrame     || 
          function (callback, element) {
            window.setTimeout(callback, 1000 / 60);
          };
})();
  
function setFrameCallback(onFrame, element) {
  (function animloop() {
    onFrame();
    window.requestAnimFrame(animloop, element);
  })();
}

$(function() {
	canvas = $('#viewport').get(0);
	
	// Fit the canvas to the window (or frame)
	canvas.width = $(window).width();
	canvas.height = $(window).height();
	
	// Get the GL Context (try 'webgl' first, then fallback)
	gl = getAvailableContext(canvas, ['webgl', 'experimental-webgl']);

	if(!gl) {
		$('#viewport-frame').remove();
		$('#webgl-error').show();
	} else {
		initEvents();
		
		gl.viewportWidth = canvas.width;
		gl.viewportHeight = canvas.height;
		
    initGL();
		
		// Draw Frames in quick succession
		setFrameCallback(function () {
      drawFrame();
      frame++;
		}, canvas);
		
		// FPS Counter
		setInterval(function () {
			$('#fps').html(frame);
			frame = 0;
		}, 1000); // TODO: This is pretty clunky. Find a better way...
	}
});
