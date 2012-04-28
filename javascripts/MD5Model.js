/* 
 * md5Mesh.js - Parses MD5 Mesh and Animation files (idTech 4) for use in WebGL
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

// MD5Model: loads, binds, animates and renders .md5mesh models

function MD5Model() {
  this.joints = [];
	this.meshes = [];
}

MD5Model.ensureDefaultTextures = function () {
  if (!this.defaultDiffuseMap) {
    this.defaultDiffuseMap = gl.createSolidTexture([200, 200, 200, 255]);
  }

  if (!this.defaultSpecularMap) {
    this.defaultSpecularMap = gl.createSolidTexture([0, 0, 0, 255]);
  }

  if (!this.defaultNormalMap) {
    this.defaultNormalMap = gl.createSolidTexture([0, 0, 255, 255]);
  }
};

MD5Model.load = function (url) {
  var model = new MD5Model;

	loadResource(url, function(request) {
	  model.parse(request.responseText);
	  model.compile();
	});

	return model;
};

MD5Model.prototype.parse = function (src) {
  var that = this;

	src.replace(/joints \{([^}]*)\}/m, function ($0, jointSrc) {
		jointSrc.replace(/\"(.+)\"\s(.+) \( (.+) (.+) (.+) \) \( (.+) (.+) (.+) \)/g, function ($0, name, parent, x, y, z, ox, oy, oz) {			
			that.joints.push({
				name: name,
				parent: parseInt(parent), 
				pos: [parseFloat(x), parseFloat(y), parseFloat(z)], 
				orient: quat4.calculateW([parseFloat(ox), parseFloat(oy), parseFloat(oz), 0])
			});
		});
	});
	
	src.replace(/mesh \{([^}]*)\}/mg, function ($0, meshSrc) {
	  var mesh = new MD5Mesh();

	  meshSrc.replace(/shader \"(.+)\"/, function ($0, shader) {
  		mesh.shader = shader;
  	});

  	meshSrc.replace(/vert .+ \( (.+) (.+) \) (.+) (.+)/g, function ($0, u, v, weightIndex, weightCount) {
  		mesh.verts.push({
  			pos: [0, 0, 0],
  			normal: [0, 0, 0],
  			tangent: [0, 0, 0],
  			texCoord: [parseFloat(u), parseFloat(v)],
  			weight: {
  				index: parseInt(weightIndex), 
  				count: parseInt(weightCount)
  			}
  		});
  	});

  	meshSrc.replace(/tri .+ (.+) (.+) (.+)/g, function ($0, i1, i2, i3) {
  		mesh.tris.push(parseInt(i1));
  		mesh.tris.push(parseInt(i2));
  		mesh.tris.push(parseInt(i3));
  	});
  	mesh.elementCount = mesh.tris.length;

  	meshSrc.replace(/weight .+ (.+) (.+) \( (.+) (.+) (.+) \)/g, function ($0, joint, bias, x, y, z) {
  		mesh.weights.push({
  			joint: parseInt(joint), 
  			bias: parseFloat(bias), 
  			pos: [parseFloat(x), parseFloat(y), parseFloat(z)],
  			normal: [0, 0, 0],
  			tangent: [0, 0, 0]
  		});
  	});

		that.meshes.push(mesh);
	});
};

MD5Model.prototype.compile = function () {
  MD5Model.ensureDefaultTextures();

  for (var i = 0; i < this.meshes.length; i++) {
	  var mesh = this.meshes[i];

	  mesh.compile(this.joints);

	  mesh.initializeBuffers();

		mesh.vertBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vertBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, mesh.vertArray, gl.STATIC_DRAW);

		mesh.indexBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.indexBuffer);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indexArray, gl.STATIC_DRAW);

		// Set defaults
		mesh.diffuseMap = MD5Model.defaultDiffuseMap;
		mesh.specularMap = MD5Model.defaultSpecularMap;
		mesh.normalMap = MD5Model.defaultNormalMap;

		// Attempt to load actual textures
		mesh.diffuseMap = gl.loadTexture('base/' + mesh.shader + '.png');
		mesh.specularMap = gl.loadTexture('base/' + mesh.shader + '_s.png');
		mesh.normalMap = gl.loadTexture('base/' + mesh.shader + '_local.png');
	}
};

// Skins the model with the given joint set
// Passing null to joints results in the bind pose 
MD5Model.prototype.skin = function (joints) {
	if(!joints) {
	  joints = this.joints;
	}

	for (var i = 0; i < this.meshes.length; i++) {
	  var mesh = this.meshes[i];

		mesh.skin(joints);

		gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vertBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, mesh.vertArray, gl.STATIC_DRAW);
	}
};

// Plays an animation
MD5Model.prototype.playAnim = function (anim, loop) {
	var that = this,
	    animFrame = 0,
      interval = 1000 / anim.frameRate;

	that.animInterval = setInterval(function () {
		joints = anim.getFrameJoints(animFrame % anim.frames.length);
		that.skin(joints);
		animFrame++;
		if (animFrame >= anim.frames.length) {
			if (loop) {
				animFrame = 0;
			} else {
			  that.stopAnim();
			}
		}
	}, interval);
};

MD5Model.prototype.stopAnim = function () {
	clearInterval(this.animInterval);
};

MD5Model.prototype.draw = function (shader) {
	// Enable vertex arrays
	gl.enableVertexAttribArray(shader.attribute.position);
	gl.enableVertexAttribArray(shader.attribute.texCoord);

	if (shader.attribute.normal != -1) {
		gl.enableVertexAttribArray(shader.attribute.normal);
	}

	if (shader.attribute.tangent != -1) {
		gl.enableVertexAttribArray(shader.attribute.tangent);
	}

	for (var i = 0; i < this.meshes.length; i++) {
		var mesh = this.meshes[i];

		if (mesh.vertBuffer != null && mesh.indexBuffer != null) {
			// Set Textures
			if (shader.uniform.diffuse) {
				gl.activeTexture(gl.TEXTURE0);
				gl.bindTexture(gl.TEXTURE_2D, mesh.diffuseMap);
				gl.uniform1i(shader.uniform.diffuse, 0);
			}

			if (shader.uniform.specular) {
				gl.activeTexture(gl.TEXTURE1);
				gl.bindTexture(gl.TEXTURE_2D, mesh.specularMap);
				gl.uniform1i(shader.uniform.specular, 1);
			}

			if (shader.uniform.normalMap) {
				gl.activeTexture(gl.TEXTURE2);
				gl.bindTexture(gl.TEXTURE_2D, mesh.normalMap);
				gl.uniform1i(shader.uniform.normalMap, 2);
			}

			// Draw the mesh
			gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vertBuffer);

			gl.vertexAttribPointer(shader.attribute.position, 3, gl.FLOAT, false, mesh.stride, 0);
			gl.vertexAttribPointer(shader.attribute.texCoord, 2, gl.FLOAT, false, mesh.stride, 3 * 4);

			// NOTE: We allow these two to normalize themselves because the native code will probably go faster than the js calcualtions.
			// (Should test that sometime!)
			if (shader.attribute.normal != -1) {
				gl.vertexAttribPointer(shader.attribute.normal, 3, gl.FLOAT, true, mesh.stride, 5 * 4);
			}

			if (shader.attribute.tangent != -1) {
				gl.vertexAttribPointer(shader.attribute.tangent, 3, gl.FLOAT, true, mesh.stride, 8 * 4);
			}

			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.indexBuffer);
			gl.drawElements(gl.TRIANGLES, mesh.elementCount, gl.UNSIGNED_SHORT, 0);
		}
	}
};
