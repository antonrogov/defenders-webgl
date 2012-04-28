var modelViewMat, projectionMat, modelViewInvMat;
var activeShader;
var model, anim, model2;
var nullTexture;

var ambientLight = vec3.create([0.2, 0.2, 0.2]);
var lightPos = vec3.create([400, 400, 400]);
var lightColor = vec3.create([1, 1, 1]);
var specularColor = vec3.create([1, 1, 1]);
var shininess = 8;

var zAngle = 0;
var xAngle = 0;
var frame = 0;

// Set up basic GL State up front
function initGL() {
	gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
	
	gl.clearColor(0.0, 0.0, 0.0, 1.0);
	gl.clearDepth(1.0);
	gl.enable(gl.DEPTH_TEST);
	gl.depthFunc(gl.LEQUAL);
	
	gl.enable(gl.BLEND);
	gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
	
	projectionMat = mat4.create();
	mat4.perspective(45.0, gl.viewportWidth/gl.viewportHeight, 1.0, 1000.0, projectionMat);
	
	modelViewMat = mat4.create();
	modelViewInvMat = mat3.create();
	
	activeShader = gl.createShaderProgram('normal-vs', 'normal-fs');
	
  model = MD5Model.load('base/models/md5/monsters/hellknight/hellknight.md5mesh');
  anim = MD5Anim.load('base/models/md5/monsters/hellknight/idle2.md5anim');
  model.playAnim(anim, true);

  model2 = MD5Model.load('base/models/md5/monsters/cube/cube.md5mesh');
}

// Draw a single frame
function drawFrame() {
  var shader = activeShader;

	// Clear back buffer
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	
  if(!model) { return; }
	
	// Set Shader
	gl.useProgram(shader);
	
	// Matrix setup
	mat4.identity(modelViewMat);
	mat4.translate(modelViewMat, [0, 0, -160]);
	mat4.rotateX(modelViewMat, xAngle);
	mat4.translate(modelViewMat, [0, -65, 0]);
	mat4.rotateX(modelViewMat, -Math.PI/2);
	mat4.rotateZ(modelViewMat, zAngle-Math.PI/2);
	
	gl.uniformMatrix4fv(shader.uniform.modelViewMat, false, modelViewMat);
	gl.uniformMatrix4fv(shader.uniform.projectionMat, false, projectionMat);
	
	if(shader.uniform.modelViewInvMat) {
		mat4.toInverseMat3(modelViewMat, modelViewInvMat);
		gl.uniformMatrix3fv(shader.uniform.modelViewInvMat, false, modelViewInvMat);
	}
	
	// Lighting
	if(shader.uniform.ambientLight)
		gl.uniform3fv(shader.uniform.ambientLight, ambientLight);
	
	if(shader.uniform.lightPos)
		gl.uniform3fv(shader.uniform.lightPos, lightPos);
	
	if(shader.uniform.lightColor)
		gl.uniform3fv(shader.uniform.lightColor, lightColor);
	
	if(shader.uniform.specularColor)
		gl.uniform3fv(shader.uniform.specularColor, specularColor);
	
	if(shader.uniform.shininess)
		gl.uniform1f(shader.uniform.shininess, shininess);

  model.draw(shader);
  model2.draw(shader);
}
