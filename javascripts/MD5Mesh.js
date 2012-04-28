// MD5Mesh: builds mesh from joints and generates arrays for rendering

function MD5Mesh() {
  this.shader = '';
	this.verts = [];
	this.tris = [];
	this.weights = [];
	this.stride = MD5Mesh.elementSize * 4;
	this.vertBuffer = null;
	this.indexBuffer = null;
	this.vertArray = null;
	this.indexArray = null;
	this.elementCount = 0;
}

MD5Mesh.maxWeights = 6;
MD5Mesh.elementSize =
		  2  // UV
		+ 3  // Normal
		+ 3  // Tangent
		+ 3; // Position

MD5Mesh.prototype.compile = function (joints) {
	var rotatedPos = [0, 0, 0];
	
	// Calculate transformed vertices in the bind pose
	for (var i = 0; i < this.verts.length; i++) {
		var vert = this.verts[i];
		
		vert.pos = [0, 0, 0];
		
		for (var j = 0; j < vert.weight.count; j++) {
			var weight = this.weights[vert.weight.index + j],
			    joint = joints[weight.joint];
			
			// Rotate position
			quat4.multiplyVec3(joint.orient, weight.pos, rotatedPos);
			
			// Translate position
			// The sum of all weight biases should be 1.0
			vert.pos[0] += (joint.pos[0] + rotatedPos[0]) * weight.bias;
			vert.pos[1] += (joint.pos[1] + rotatedPos[1]) * weight.bias;
			vert.pos[2] += (joint.pos[2] + rotatedPos[2]) * weight.bias;
		}
	}
	
	// Calculate normals/tangents
	var a = [0, 0, 0],
	    b = [0, 0, 0],
	    triNormal = [0, 0, 0],
	    triTangent = [0, 0, 0];
	
	for (var i = 0; i < this.tris.length; i += 3) {
		var vert1 = this.verts[this.tris[i + 0]],
		    vert2 = this.verts[this.tris[i + 1]],
		    vert3 = this.verts[this.tris[i + 2]],
		    c2c1t, c2c1b, c3c1t, c3c1b;
		
		// Normal
		vec3.subtract(vert2.pos, vert1.pos, a);
		vec3.subtract(vert3.pos, vert1.pos, b);
		
		vec3.cross(b, a, triNormal);
		vec3.add(vert1.normal, triNormal);
		vec3.add(vert2.normal, triNormal);
		vec3.add(vert3.normal, triNormal);
		
		// Tangent
		c2c1t = vert2.texCoord[0] - vert1.texCoord[0];
		c2c1b = vert2.texCoord[1] - vert1.texCoord[1];
		c3c1t = vert3.texCoord[0] - vert1.texCoord[0];
		c3c1b = vert3.texCoord[0] - vert1.texCoord[1];
		
		triTangent = [
		  c3c1b * a[0] - c2c1b * b[0],
		  c3c1b * a[1] - c2c1b * b[1],
		  c3c1b * a[2] - c2c1b * b[2]
		];
		vec3.add(vert1.tangent, triTangent);
		vec3.add(vert2.tangent, triTangent);
		vec3.add(vert3.tangent, triTangent);
	}
	
	var invOrient = [0, 0, 0, 0];
	// Get the "weighted" normal and tangent
	for (var i = 0; i < this.verts.length; i++) {
		var vert = this.verts[i];

		vec3.normalize(vert.normal);
		vec3.normalize(vert.tangent);
		
		for (var j = 0; j < vert.weight.count; j++) {
			var weight = this.weights[vert.weight.index + j];
			
			if (weight.bias != 0) {
				var joint = joints[weight.joint];
				
				// Rotate position
				quat4.inverse(joint.orient, invOrient);
				quat4.multiplyVec3(invOrient, vert.normal, weight.normal);
				quat4.multiplyVec3(invOrient, vert.tangent, weight.tangent);
			}
		}
	}
};

// Creates the model's gl buffers and populates them with the bind-pose mesh
MD5Mesh.prototype.initializeBuffers = function () {
	this.vertArray = new Float32Array(MD5Mesh.elementSize * this.verts.length);
	this.indexArray = new Uint16Array(this.tris);
	
	// Push all vertex information into the vertex buffer
	for (var i = 0; i < this.verts.length; i++) {
		var vertOffset = i * MD5Mesh.elementSize;
		var vert = this.verts[i];
		
		// Position
		this.vertArray[vertOffset + 0] = vert.pos[0];
		this.vertArray[vertOffset + 1] = vert.pos[1];
		this.vertArray[vertOffset + 2] = vert.pos[2];
		
		// TexCoord
		this.vertArray[vertOffset + 3] = vert.texCoord[0];
		this.vertArray[vertOffset + 4] = vert.texCoord[1];
		
		// Normal
		vec3.normalize(vert.normal);
		this.vertArray[vertOffset + 5] = vert.normal[0];
		this.vertArray[vertOffset + 6] = vert.normal[1];
		this.vertArray[vertOffset + 7] = vert.normal[2];
		
		// Tangent
		vec3.normalize(vert.tangent);
		this.vertArray[vertOffset + 8] = vert.tangent[0];
		this.vertArray[vertOffset + 9] = vert.tangent[1];
		this.vertArray[vertOffset +10] = vert.tangent[2];
	}
};

// Skins the model with the given joint set
// Passing null to joints results in the bind pose 
MD5Mesh.prototype.skin = function (joints) {
  if (!this.vertArray) {
    return;
  }

	var rotatedPos = [0, 0, 0];
	
	var vx, vy, vz;
	var nx, ny, nz;
	var tx, ty, tz;
	
	// Calculate transformed vertices in the bind pose
	for (var i = 0; i < this.verts.length; i++) {
		var vertOffset = i * MD5Mesh.elementSize;
		var vert = this.verts[i];
		
		vx = 0; vy = 0; vz = 0;
		nx = 0; ny = 0; nz = 0;
		tx = 0; ty = 0; tz = 0;
		
		vert.pos = [0, 0, 0];
		
		for (var j = 0; j < vert.weight.count; j++) {
			var weight = this.weights[vert.weight.index + j];
			var joint = joints[weight.joint];
			
			// Rotate position
			quat4.multiplyVec3(joint.orient, weight.pos, rotatedPos);
			
			// Translate position
			vert.pos[0] += (joint.pos[0] + rotatedPos[0]) * weight.bias;
			vert.pos[1] += (joint.pos[1] + rotatedPos[1]) * weight.bias;
			vert.pos[2] += (joint.pos[2] + rotatedPos[2]) * weight.bias;
			vx += (joint.pos[0] + rotatedPos[0]) * weight.bias;
			vy += (joint.pos[1] + rotatedPos[1]) * weight.bias;
			vz += (joint.pos[2] + rotatedPos[2]) * weight.bias;
			
			// Rotate Normal
			quat4.multiplyVec3(joint.orient, weight.normal, rotatedPos);
			nx += rotatedPos[0] * weight.bias;
			ny += rotatedPos[1] * weight.bias;
			nz += rotatedPos[2] * weight.bias;
			
			// Rotate Tangent
			quat4.multiplyVec3(joint.orient, weight.tangent, rotatedPos);
			tx += rotatedPos[0] * weight.bias;
			ty += rotatedPos[1] * weight.bias;
			tz += rotatedPos[2] * weight.bias;
		}
		
		// Position
		this.vertArray[vertOffset + 0] = vx;
		this.vertArray[vertOffset + 1] = vy;
		this.vertArray[vertOffset + 2] = vz;
		
		// No need to re-add texCoords. They don't change.
		
		// Normal
		this.vertArray[vertOffset + 5] = nx;
		this.vertArray[vertOffset + 6] = ny;
		this.vertArray[vertOffset + 7] = nz;
	
		// Tangent
		this.vertArray[vertOffset + 8] = tx;
		this.vertArray[vertOffset + 9] = ty;
		this.vertArray[vertOffset +10] = tz;
	}
};
