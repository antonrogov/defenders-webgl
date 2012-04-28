// MD5Anim: loads .md5anim file and builds joints for each frame

function MD5Anim() {
  this.frameRate = 24;
  this.hierarchy = [];
  this.baseFrame = [];
  this.frames = [];
}

MD5Anim.load = function (url) {
  var anim = new MD5Anim();

  loadResource(url, function (request) {
    anim.parse(request.responseText);
  });

	return anim;
};

MD5Anim.prototype.parse = function (src) {
  var that = this;

	src.replace(/frameRate (.+)/, function ($0, frameRate) {
		that.frameRate = parseInt(frameRate);
	});

	src.replace(/hierarchy \{([^}]*)\}/m, function ($0, hierarchySrc) {
		hierarchySrc.replace(/\"(.+)\"\s([-\d]+) (\d+) (\d+)\s/g, function ($0, name, parent, flags, index) {
			that.hierarchy.push({
				name: name,
				parent: parseInt(parent), 
				flags: parseInt(flags), 
				index: parseInt(index)
			});
		});
	});

	src.replace(/baseframe \{([^}]*)\}/m, function ($0, baseframeSrc) {
		baseframeSrc.replace(/\( (.+) (.+) (.+) \) \( (.+) (.+) (.+) \)/g, function ($0, x, y, z, ox, oy, oz) {
			that.baseFrame.push({
				pos: [parseFloat(x), parseFloat(y), parseFloat(z)], 
				orient: [parseFloat(ox), parseFloat(oy), parseFloat(oz)]
			});
		});
	});


	src.replace(/frame \d+ \{([^}]*)\}/mg, function ($0, frameSrc) {
		var frame = [];
		frameSrc.replace(/([-\.\d]+)/g, function ($0, value) {
			frame.push(parseFloat(value));
		});
		that.frames.push(frame);
	});
};

MD5Anim.prototype.getFrameJoints = function (frame) {
	if (frame < 0 || frame >= this.frames.length) {
	  return null;
	}

	var frameData = this.frames[frame];
	var joints = [];

	for (var i = 0; i < this.baseFrame.length; i++) {
		var baseJoint = this.baseFrame[i];
		var offset = this.hierarchy[i].index;
		var flags = this.hierarchy[i].flags;

		var aPos = [baseJoint.pos[0], baseJoint.pos[1], baseJoint.pos[2]];
		var aOrient = [baseJoint.orient[0], baseJoint.orient[1], baseJoint.orient[2], 0];

		var j = 0;

		if (flags & 1) { // Translate X
			aPos[0] = frameData[offset + j];
			++j;
		}

		if (flags & 2) { // Translate Y
			aPos[1] = frameData[offset + j];
			++j;
		}

		if (flags & 4) { // Translate Z
			aPos[2] = frameData[offset + j];
			++j;
		}

		if (flags & 8) { // Orient X
			aOrient[0] = frameData[offset + j];
			++j;
		}

		if (flags & 16) { // Orient Y
			aOrient[1] = frameData[offset + j];
			++j;
		}

		if (flags & 32) { // Orient Z
			aOrient[2] = frameData[offset + j];
			++j;
		}

		// Recompute W value
		quat4.calculateW(aOrient);

		// Multiply against parent 
		//(assumes parents always have a lower index than their children)
		var parentIndex = this.hierarchy[i].parent;

		if (parentIndex >= 0) {
			var parentJoint = joints[parentIndex];

			quat4.multiplyVec3(parentJoint.orient, aPos);
			vec3.add(aPos, parentJoint.pos);
			quat4.multiply(parentJoint.orient, aOrient, aOrient);
		}

		joints.push({pos: aPos, orient: aOrient}); // This could be so much better!
	}

	return joints;
};
