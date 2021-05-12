var VSHADER_SOURCE =
	'attribute vec4 a_Position;\n' +
	'uniform float scaleH;\n' +
	'uniform mat4 u_ModelMatrix;\n' +
	'varying vec4 v_Color;\n' +
	'void main(){\n' +
	'	gl_Position = u_ModelMatrix * a_Position * vec4(1, scaleH, 1, 1);\n' +
	'	v_Color = gl_Position * 0.5 + 0.5;\n' +
	'}\n';
	
var FSHADER_SOURCE = 
	'precision mediump float;\n' +
	'varying vec4 v_Color;\n' +
	'void main(){\n' +
	'	gl_FragColor = v_Color;\n' +
	'}\n';

window.onload = function main()
{
	var canvas = document.getElementById('webgl');
	
	var gl = getWebGLContext(canvas);
	if(!gl){
		console.log('Failed to get the rendering context for WebGL');
		return;
	}
	canvas.width = canvas.clientWidth;
	canvas.height = canvas.clientHeight;
	
	var slideX = document.getElementById('x');
	var slideY = document.getElementById('y');
	slideX.max = gl.canvas.width;
	slideY.max = gl.canvas.height;
	slideX.value = gl.canvas.width/2;
	slideY.value = gl.canvas.height/2.3;
	var translation = [slideX.value/gl.canvas.width * 2.0 - 1.0, -slideY.value/gl.canvas.height * 2.0 + 1.0];
	document.getElementById('xdisp').innerHTML = slideX.value;
	document.getElementById('ydisp').innerHTML = slideY.value;

	var angle = document.getElementById('angle');
	angle.value = 0.0;
	angle.step = 1;
	var angval = angle.value;
	document.getElementById('angdisp').innerHTML = angle.value;

	var scaleX = document.getElementById('scaleX');
	var scaleY = document.getElementById('scaleY');
	scaleX.value = 1;
	scaleY.value = 1;
	scaleX.step = 0.05;
	scaleY.step = 0.05;
	var scale = [scaleX.value, scaleY.value];
	document.getElementById('scalexdisp').innerHTML = scaleX.value;
	document.getElementById('scaleydisp').innerHTML = scaleY.value;
	
	if(!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)){
		console.log('Failed to initialaze shaders');
		return;
	}
	
	var u_scaleH = gl.getUniformLocation(gl.program, 'scaleH');
	gl.uniform1f(u_scaleH, canvas.width/canvas.height);
	
	var n = 4;
	
	gl.clearColor(0.8, 0.8, 0.8, 1.0);
	
	var u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
	if(!u_ModelMatrix){
		console.log('Failed to get the storage location of u_ModelMatrix');
		return;
	}
	
	var modelMatrix = new Matrix4;
	var vertexBuffer = gl.createBuffer();
	
	var a_Position = gl.getAttribLocation(gl.program, 'a_Position');
	if(a_Position < 0){
		console.log('Failed to get the storage location of a_Position');
		return -1;
	}
	
	draw();
	
	function draw(){
		gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
		gl.clear(gl.COLOR_BUFFER_BIT);
		
		gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
	
		setGeometry(gl);
		
		gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(a_Position);
	
		modelMatrix.setTranslate(translation[0], translation[1], 0);
		modelMatrix.rotate(-angval, 0, 0, 1);
		modelMatrix.scale(scale[0], scale[1], 1);
		gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
		gl.drawArrays(gl.TRIANGLE_STRIP, 0, n);
	}
	
	slideX.oninput = function(){
		translation[0] = this.value/gl.canvas.width *2-1;
		draw();
		document.getElementById('xdisp').innerHTML = slideX.value;
	}
	slideY.oninput = function(){
		translation[1] = -this.value/gl.canvas.height *2+1;
		draw();
		document.getElementById('ydisp').innerHTML = slideY.value;
	}
	scaleX.oninput = function(){
		scale[0] = this.value;
		draw();
		document.getElementById('scalexdisp').innerHTML = scaleX.value;
	}
	scaleY.oninput = function(){
		scale[1] = this.value;
		draw();
		document.getElementById('scaleydisp').innerHTML = scaleY.value;
	}
	angle.oninput = function(){
		angval = this.value;
		draw();
		document.getElementById('angdisp').innerHTML = angle.value;
	}
	window.onresize = function (){
		canvas.width = canvas.clientWidth;
		canvas.height = canvas.clientHeight;
		slideX.max = gl.canvas.width;
		slideY.max = gl.canvas.height;
		translation = [slideX.value/gl.canvas.width * 2.0 - 1.0, -slideY.value/gl.canvas.height * 2.0 + 1.0];
		gl.uniform1f(u_scaleH, canvas.width/canvas.height);
		draw();
	}
}

function setGeometry(gl){
	gl.bufferData(
		gl.ARRAY_BUFFER,
		new Float32Array([
			-0.2, 0.2,
			0.2, 0.2,
			-0.2, -0.2,
			0.2, -0.2
		]),
		gl.STATIC_DRAW
	);
}



