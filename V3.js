var SHADOW_VSHADER_SOURCE =
	'attribute vec4 a_Position;\n' +
	'uniform mat4 u_MvpMatrix;\n' +
	'void main() {\n' +
	'	gl_Position = u_MvpMatrix * a_Position;\n' +
	'}\n';

// Fragment shader program for generating a shadow map
var SHADOW_FSHADER_SOURCE =
	'#ifdef GL_ES\n' +
	'precision mediump float;\n' +
	'#endif\n' +
	'void main() {\n' +
	'	const vec4 bitShift = vec4(1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0);\n' +
	'	const vec4 bitMask = vec4(1.0/256.0, 1.0/256.0, 1.0/256.0, 0.0);\n' +
	'	vec4 rgbaDepth = fract(gl_FragCoord.z * bitShift);\n' + // Calculate the value stored into each byte
	'	rgbaDepth -= rgbaDepth.gbaa * bitMask;\n' + // Cut off the value which do not fit in 8 bits
	'	gl_FragColor = rgbaDepth;\n' +
	'}\n';

var VSHADER_SOURCE = 
	'attribute vec4 a_Position;\n' +
	'attribute vec2 a_TexCoord;\n' +
	'attribute vec4 a_Normal;\n' +
	'uniform mat4 u_ModelMatrix;\n' +
	'uniform mat4 u_ViewMatrix;\n' +
	'uniform mat4 u_ProjMatrix;\n' +
	'uniform mat4 u_NormalMatrix;\n' +
	'uniform mat4 u_MvpMatrixFromLight;\n' +
	'varying vec4 v_PositionFromLight;\n' +
	'varying vec2 v_TexCoord;\n' +
	'varying vec3 v_Normal;\n' +
	'varying vec3 v_Position;\n' +
	'varying vec3 v_VertexToEye;\n' +
	'void main(){\n' +
	'	gl_Position = u_ProjMatrix * u_ViewMatrix * u_ModelMatrix * a_Position;\n' +
	'	v_Normal = normalize(vec3(u_NormalMatrix * a_Normal));\n' +
	'	v_Position = vec3(u_ModelMatrix * a_Position);\n' +
	'	v_VertexToEye = vec3(u_ViewMatrix * u_ModelMatrix * a_Position);\n' +
	'	v_TexCoord = a_TexCoord;\n' +
	'	v_PositionFromLight = u_MvpMatrixFromLight * a_Position;\n' +
	'}\n';
	
var FSHADER_SOURCE = 
	'#ifdef GL_ES\n' +
	'precision mediump float;\n' +
	'#endif\n' +
	'uniform vec3 u_LightColor;\n' +
	'uniform vec3 u_LightPosition;\n' +
	'uniform vec3 u_AmbientLight;\n' +
	'uniform vec3 u_DirLight;\n' +
	'uniform vec3 u_DirLightColor;\n' +
	'uniform sampler2D u_Sampler;\n' +
	'uniform sampler2D u_ShadowMap;\n' +
	'varying vec4 v_PositionFromLight;\n' +
	
	// Recalculate the z value from the rgba
	'float unpackDepth(const in vec4 rgbaDepth) {\n' +
	'	const vec4 bitShift = vec4(1.0, 1.0/256.0, 1.0/(256.0*256.0), 1.0/(256.0*256.0*256.0));\n' +
	'	float depth = dot(rgbaDepth, bitShift);\n' + // Use dot() since the calculations is same
	'	return depth;\n' +
	'}\n' +
	'varying vec2 v_TexCoord;\n' +
	'varying vec3 v_Normal;\n' +
	'varying vec3 v_Position;\n' +
	'varying vec3 v_VertexToEye;\n' +
	'void main(){\n' +
	'	vec3 shadowCoord = (v_PositionFromLight.xyz/v_PositionFromLight.w)/2.0 + 0.5;\n' +
	'	vec4 rgbaDepth = texture2D(u_ShadowMap, shadowCoord.xy);\n' +
	'	float depth = unpackDepth(rgbaDepth);\n' + // Recalculate the z value from the rgba
	'	vec4 color = texture2D(u_Sampler, v_TexCoord);\n' +
	'	vec3 normal = normalize(v_Normal);\n' +
	
	// направление от позиционного источника к вершинам
	'	vec3 lightDirection = normalize(u_LightPosition - v_Position);\n' +
	
	// направление от направленного источника
	'	vec3 dirLight = normalize(u_DirLight);\n' +
	'	vec3 viewVectorEye = -normalize(v_VertexToEye);\n' + // вектор от точки до камеры
	
	// зеркальное отражение от позиционного источника
	'	vec3 reflectionVector = normalize(reflect(-lightDirection, normal));\n' +
	'	float specularDotL = max(dot(reflectionVector, viewVectorEye), 0.0);\n' +
	'	float specularParam = pow(specularDotL, 50.0);\n' +
	'	float specularVisibility = ( shadowCoord.z > depth + 0.0015 && specularDotL > 0.0 ) ? 0.0 : 1.0;\n' +
	'	vec3 specular = u_LightColor * color.rgb * specularParam * specularVisibility;\n' +
	
	// зеркальное отражение от направленного источника
	'	vec3 reflectionVector2 = normalize(reflect(-dirLight, normal));\n' +
	'	float specularDotL2 = max(dot(reflectionVector2, viewVectorEye), 0.0);\n' +
	'	float specularParam2 = pow(specularDotL2, 1.0);\n' +
	'	vec3 specular2 = u_DirLightColor * color.rgb * specularParam2;\n' +
	
	// диффузное отражение от позиционного источника
	'	float nDotL = max(dot(lightDirection, normal), 0.0);\n' +
	'	float visibility = ( shadowCoord.z > depth + 0.0015 && nDotL > 0.0 ) ? 0.6 : 1.0;\n' +
	// '	float visibility = ( shadowCoord.z > depth + 0.0015 && max(dot(lightDirection, normal), 0.0) > 0.0 ) ? 0.6 : 1.0;\n' +
	'	vec3 diffuse = u_LightColor * color.rgb * nDotL;\n' +
	
	// диффузное отражение от направленного источника
	'	float nDotL2 = max(dot(dirLight, normal), 0.0);\n' +
	'	vec3 diffuse2 = u_DirLightColor * color.rgb * nDotL2;\n' +
	
	// фоновое освещение
	'	vec3 ambient = u_AmbientLight * color.rgb;\n' +
	
	// определение цвета
	// '	gl_FragColor = vec4( (specular * visibility + diffuse * visibility + specular2 + diffuse2 + ambient) , color.a);\n' +
	'	gl_FragColor = vec4( (specular * visibility + diffuse * visibility + ambient) , color.a);\n' +
	'}\n';
	
var g_objDoc = null; // Информация о файлах OBJ
var g_drawingInfo = null; // Информация для отрисовки объекта

var OFFSCREEN_WIDTH, OFFSCREEN_HEIGHT;
	
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
	OFFSCREEN_WIDTH = canvas.clientWidth *3;
	OFFSCREEN_HEIGHT = canvas.clientHeight *3;
	
	var shadowProgram = createProgram(gl, SHADOW_VSHADER_SOURCE, SHADOW_FSHADER_SOURCE);
	shadowProgram.name = "shadowProgram";
	shadowProgram.a_Position = gl.getAttribLocation(shadowProgram, 'a_Position');
	shadowProgram.u_MvpMatrix = gl.getUniformLocation(shadowProgram, 'u_MvpMatrix');
	if (shadowProgram.a_Position < 0 || !shadowProgram.u_MvpMatrix) {
		console.log('Failed to get the storage location of attribute or uniform variable from shadowProgram'); 
		return;
	}
	
	var normalProgram = createProgram(gl, VSHADER_SOURCE, FSHADER_SOURCE);
	normalProgram.name = "normalProgram";
  
	normalProgram.u_MvpMatrixFromLight = gl.getUniformLocation(normalProgram, 'u_MvpMatrixFromLight');
	normalProgram.u_ShadowMap = gl.getUniformLocation(normalProgram, 'u_ShadowMap');
  
	if (normalProgram.a_Position < 0 || !normalProgram.u_MvpMatrixFromLight || !normalProgram.u_ShadowMap) {
		console.log('Failed to get the storage location of attribute or uniform variable from normalProgram'); 
		return;
	}
	
	normalProgram.a_Position = gl.getAttribLocation(normalProgram, 'a_Position');
	normalProgram.a_Normal = gl.getAttribLocation(normalProgram, 'a_Normal');
	normalProgram.a_TexCoord = gl.getAttribLocation(normalProgram, 'a_TexCoord');
	normalProgram.u_ModelMatrix = gl.getUniformLocation(normalProgram, 'u_ModelMatrix');
	normalProgram.u_ViewMatrix = gl.getUniformLocation(normalProgram, 'u_ViewMatrix');
	normalProgram.u_ProjMatrix = gl.getUniformLocation(normalProgram, 'u_ProjMatrix');
	normalProgram.u_NormalMatrix = gl.getUniformLocation(normalProgram, 'u_NormalMatrix');
	normalProgram.u_LightColor = gl.getUniformLocation(normalProgram, 'u_LightColor');
	normalProgram.u_LightPosition = gl.getUniformLocation(normalProgram, 'u_LightPosition');
	normalProgram.u_AmbientLight = gl.getUniformLocation(normalProgram, 'u_AmbientLight');
	normalProgram.u_DirLight = gl.getUniformLocation(normalProgram, 'u_DirLight');
	normalProgram.u_DirLightColor = gl.getUniformLocation(normalProgram, 'u_DirLightColor');
	
	// Создание пустых буфферных объектов для передачи координат вершин, цветов, нормалей и индексов
	var model = initVertexBuffers(gl);
	if (!model) {
		console.log('Failed to set the vertex information');
		return;
	}
  
	var texture = gl.createTexture();
	var u_Sampler = gl.getUniformLocation(normalProgram, 'u_Sampler');
		
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	
	var fbo = initFramebufferObject(gl, canvas);
	if (!fbo) {
		console.log('Failed to initialize frame buffer object');
		return;
	}
	var textureUnit = 1;
	var shadowMapTextureUnit = 0;
  
	gl.clearColor(0.8, 0.8, 0.8, 1.0);
	gl.enable(gl.DEPTH_TEST);
	gl.enable(gl.CULL_FACE);
	
	var light_x = positional_x.value, light_y = positional_y.value, light_z = positional_z.value;
	var viewProjMatrixFromLight = new Matrix4(); // Prepare a view projection matrix for generating a shadow map
	viewProjMatrixFromLight.setPerspective(90.0, OFFSCREEN_WIDTH/OFFSCREEN_HEIGHT, 1.0, 200.0);
	viewProjMatrixFromLight.lookAt(light_x, light_y, light_z, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0);
	
	gl.useProgram(normalProgram);
	
	gl.uniform3f(normalProgram.u_LightColor, positional.value, positional.value, positional.value);  // цвет позиционого источника света
	gl.uniform3f(normalProgram.u_LightPosition, light_x, light_y, light_z); // координаты положения позиционого источника света
	gl.uniform3f(normalProgram.u_AmbientLight, ambient.value, ambient.value, ambient.value); // цвет фонового освещения
	gl.uniform3f(normalProgram.u_DirLight, -3.0, 5.0, 4.0);  // вектор направленного источника света
	gl.uniform3f(normalProgram.u_DirLightColor, 0.5, 0.5, 0.5); // цвет направленного источника света
	
	var modelMatrix = new Matrix4(); // Матрица модели
	var viewMatrix = new Matrix4(); // Матрица вида
	var projMatrix = new Matrix4(); // Матрица проекции
	var normalMatrix = new Matrix4(); // Матрица нормали
	var mvpMatrix = new Matrix4();
	
	var proj = document.getElementById('proj');
	changeProjectionView(); // Расчет матрицы проекции вида
	
	// Чтение OBJ файлов
	// readOBJFile('bowlingPin.obj');
	readOBJFile('multi_objs3.obj');
	
	
	var currentAngle = [0.0, 0.0];
	initEventHandlers(canvas, currentAngle);
	
	var tick = function(){
		// currentAngle = animate(currentAngle);
		
		gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);               // Change the drawing destination to FBO
		gl.viewport(0, 0, OFFSCREEN_WIDTH, OFFSCREEN_HEIGHT); // Set view port for FBO
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);   // Clear FBO  
		
		gl.useProgram(shadowProgram);
		gl.activeTexture(gl.TEXTURE0 + shadowMapTextureUnit); // Set a texture object to the texture unit
		gl.bindTexture(gl.TEXTURE_2D, fbo.texture);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, OFFSCREEN_WIDTH, OFFSCREEN_HEIGHT, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
		
		draw(shadowProgram);
		
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		gl.viewport(0, 0, canvas.width, canvas.height);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		
		gl.useProgram(normalProgram);
		gl.uniform1i(normalProgram.u_ShadowMap, shadowMapTextureUnit);  // Pass 0 because gl.TEXTURE0 is enabled
		gl.activeTexture(gl.TEXTURE0 + textureUnit); // Set a texture object to the texture unit
		gl.bindTexture(gl.TEXTURE_2D, texture);
		
		draw(normalProgram);
		
		requestAnimationFrame(tick);
	};
	tick();
	
	function readOBJFile(fileName){
		var request = new XMLHttpRequest();
		request.onreadystatechange = function() {
			if (request.readyState === 4 && request.status !== 404) {
				onReadOBJFile(request.responseText, fileName);
			}
		}
		request.open('GET', fileName, true); // Create a request to acquire the file
		request.send();                      // Send the request
	}
	
	function initVertexBuffers() {
		var o = new Object();
		o.vertexBuffer = createEmptyArrayBuffer(3, gl.FLOAT);
		o.normalBuffer = createEmptyArrayBuffer(3, gl.FLOAT);
		o.texCoordBuffer = createEmptyArrayBuffer(2, gl.FLOAT);
		o.indexBuffer = gl.createBuffer();
		return o;
	}

	function createEmptyArrayBuffer(num, type) {
		var buffer = gl.createBuffer();  // Create a buffer object
		if (!buffer) {
			console.log('Failed to create the buffer object');
			return null;
		}		
		buffer.num = num;
		buffer.type = type;
		return buffer;
	}
	
	function initAttributeVariable(a_attribute, buffer){
		gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
		gl.vertexAttribPointer(a_attribute, buffer.num, buffer.type, false, 0, 0);  // Assign the buffer object to the attribute variable
		gl.enableVertexAttribArray(a_attribute);  // Enable the assignment
	}
	
	function onReadOBJFile(fileString, fileName) {		
		var objDoc = new OBJDoc(fileName);  // Create a OBJDoc object
		var result = objDoc.parse(fileString, 1, true); // Parse the file
		if (!result) {
			g_objDoc = null; g_drawingInfo = null;
			console.log("OBJ file parsing error.");
			return;
		}
		g_objDoc = objDoc;
		//console.log(g_objDoc);
	}
	
	function initEventHandlers(canvas, currentAngle) {
	  var dragging = false;         // Dragging or not
	  var lastX = -1, lastY = -1;   // Last position of the mouse

	  canvas.onmousedown = function(ev) {   // Mouse is pressed
		var x = ev.clientX, y = ev.clientY;
		// Start dragging if a moue is in <canvas>
		var rect = ev.target.getBoundingClientRect();
		if (rect.left <= x && x < rect.right && rect.top <= y && y < rect.bottom) {
		  lastX = x; lastY = y;
		  dragging = true;
		}
	  };

	  canvas.onmouseup = function(ev) { dragging = false;  }; // Mouse is released

	  canvas.onmousemove = function(ev) { // Mouse is moved
		var x = ev.clientX, y = ev.clientY;
		if (dragging) {
		  var factor = 100/canvas.height; // The rotation ratio
		  var dx = factor * (x - lastX);
		  var dy = factor * (y - lastY);
		  // Limit x-axis rotation angle to -90 to 90 degrees
		  currentAngle[0] = Math.max(Math.min(currentAngle[0] + dy, 90.0), -90.0);
		  currentAngle[1] = currentAngle[1] + dx;
		}
		lastX = x, lastY = y;
	  };
	}
		
	function draw(program)
	{	
		// gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);  // Очистка буфферов цвета и глубины
		
		if (g_objDoc != null && g_objDoc.isMTLComplete()){ // Проверка завершения чтения и доступности информации о модели
			g_drawingInfo = onReadComplete(gl, model, g_objDoc); // Передача координат вершин, цвета, нормалей и индексов в буферные объекты
			g_objDoc = null;
		}
		if (!g_drawingInfo) return;   // Если модель еще не загрузилась
		
			
		modelMatrix.setTranslate(0.0, 0.0, 0.0); //Масштабировать, повернуть, переместить фигуру
		modelMatrix.rotate(currentAngle[0], 1.0, 0.0, 0.0);
		modelMatrix.rotate(currentAngle[1], 0.0, 1.0, 0.0);
		
		gl.uniformMatrix4fv(program.u_ModelMatrix, false, modelMatrix.elements);
		if(program.name == "normalProgram"){
			gl.texImage2D(
				gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA,
				gl.UNSIGNED_BYTE,
				document.getElementById('cb-image')
			);
			gl.uniform1i(u_Sampler, textureUnit);
			normalMatrix.setInverseOf(modelMatrix).transpose();
			gl.uniformMatrix4fv(program.u_NormalMatrix, false, normalMatrix.elements)
			mvpMatrix.set(viewProjMatrixFromLight);
			mvpMatrix.multiply(modelMatrix);
			gl.uniformMatrix4fv(program.u_MvpMatrixFromLight, false, mvpMatrix.elements);
		}
		else if(program.name == "shadowProgram"){
			normalMatrix.setInverseOf(modelMatrix).transpose();
			gl.uniformMatrix4fv(program.u_NormalMatrix, false, normalMatrix.elements)
			mvpMatrix.set(viewProjMatrixFromLight);
			mvpMatrix.multiply(modelMatrix);
			gl.uniformMatrix4fv(program.u_MvpMatrix, false, mvpMatrix.elements);
		}
		drawObj(2, program);
		
		
		
		// Для плоскости
		modelMatrix.setTranslate(0.0, -2.0, 0.0);
		gl.uniformMatrix4fv(program.u_ModelMatrix, false, modelMatrix.elements);
		
		if(program.name == "normalProgram"){
			gl.texImage2D(
				gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA,
				gl.UNSIGNED_BYTE,
				document.getElementById('pl-image')
			);
			gl.uniform1i(u_Sampler, textureUnit);
			
			normalMatrix.setInverseOf(modelMatrix).transpose();
			gl.uniformMatrix4fv(program.u_NormalMatrix, false, normalMatrix.elements)
			
			mvpMatrix.set(viewProjMatrixFromLight);
			mvpMatrix.multiply(modelMatrix);
			gl.uniformMatrix4fv(program.u_MvpMatrixFromLight, false, mvpMatrix.elements);
		}
		else if(program.name == "shadowProgram"){
			mvpMatrix.set(viewProjMatrixFromLight);
			mvpMatrix.multiply(modelMatrix);
			gl.uniformMatrix4fv(program.u_MvpMatrix, false, mvpMatrix.elements);
		}
		
		drawObj(3, program);
	}
	
	function drawObj(i, program){
		// Write date into the buffer object
		initAttributeVariable(program.a_Position, model.vertexBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, g_drawingInfo[i].vertices, gl.STATIC_DRAW);

		if(program.name == "normalProgram"){
			initAttributeVariable(program.a_Normal, model.normalBuffer);
			gl.bufferData(gl.ARRAY_BUFFER, g_drawingInfo[i].normals, gl.STATIC_DRAW);
			
			initAttributeVariable(program.a_TexCoord, model.texCoordBuffer);
			gl.bufferData(gl.ARRAY_BUFFER, g_drawingInfo[i].textureCoords, gl.STATIC_DRAW);
		}
		  
		// Write the indices to the buffer object
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.indexBuffer);
		

		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, g_drawingInfo[i].indices, gl.STATIC_DRAW);
		gl.drawElements(gl.TRIANGLES, g_drawingInfo[i].indices.length, gl.UNSIGNED_SHORT, 0);
	}
	
	function onReadComplete(gl, model, objDoc) {
		var drawingInfo = objDoc.getDrawingInfo();
		return drawingInfo;		
	}
	
	function changeProjectionView()
	{
		if(proj.value == 'p')
			projMatrix.setPerspective(35, canvas.width/canvas.height, 0.1, 100);
		else if(proj.value == 'o')
			projMatrix.setOrtho(-6.0 * canvas.width/canvas.height, 6.0 * canvas.width/canvas.height, -6.0, 6.0, 0.0, 100.0);
		gl.uniformMatrix4fv(normalProgram.u_ProjMatrix, false, projMatrix.elements);
			
		viewMatrix.setLookAt(0, 6, 20, 0, 0, 0, 0, 1, 0);
		gl.uniformMatrix4fv(normalProgram.u_ViewMatrix, false, viewMatrix.elements);
	}
	
	// Переключение проекции на веб-странице
	proj.onclick = function(){
		if(this.value == 'p'){
			this.value = 'o';
			this.innerHTML = 'Ortho';
			changeProjectionView();
		}
		else{
			this.value = 'p';
			this.innerHTML = 'Perspective';
			changeProjectionView();
		}
	}
	
	positional.oninput = function(){
		val = this.value;
		gl.uniform3f(normalProgram.u_LightColor, val, val, val);
	}
	
	positional_x.oninput = function(){
		val = this.value;
		viewProjMatrixFromLight.setPerspective(90.0, OFFSCREEN_WIDTH/OFFSCREEN_HEIGHT, 1.0, 200.0);
		viewProjMatrixFromLight.lookAt(val, positional_y.value, positional_z.value, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0);
		gl.uniform3f(normalProgram.u_LightPosition, val, positional_y.value, positional_z.value);
	}
	
	positional_y.oninput = function(){
		val = this.value;
		viewProjMatrixFromLight.setPerspective(90.0, OFFSCREEN_WIDTH/OFFSCREEN_HEIGHT, 1.0, 200.0);
		viewProjMatrixFromLight.lookAt(positional_x.value, val, positional_z.value, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0);
		gl.uniform3f(normalProgram.u_LightPosition, positional_x.value, val, positional_z.value);
	}
	
	positional_z.oninput = function(){
		val = this.value;
		viewProjMatrixFromLight.setPerspective(90.0, OFFSCREEN_WIDTH/OFFSCREEN_HEIGHT, 1.0, 200.0);
		viewProjMatrixFromLight.lookAt(positional_x.value, positional_y.value, val, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0);
		gl.uniform3f(normalProgram.u_LightPosition, positional_x.value, positional_y.value, val);
	}
	
	ambient.oninput = function(){
		val = this.value;
		gl.uniform3f(normalProgram.u_AmbientLight, val, val, val);
	}
	
	// Изменение размеров окна
	window.onresize = function (){
		canvas.width = canvas.clientWidth;
		canvas.height = canvas.clientHeight;
		changeProjectionView();
		gl.viewport(0, 0, canvas.width, canvas.height);
	}
	
}

function initFramebufferObject(gl, canvas) {
	var framebuffer, texture, depthBuffer;

	// Define the error handling function
	var error = function() {
		if (framebuffer) gl.deleteFramebuffer(framebuffer);
		if (texture) gl.deleteTexture(texture);
		if (depthBuffer) gl.deleteRenderbuffer(depthBuffer);
		return null;
	}

	// Create a framebuffer object (FBO)
	framebuffer = gl.createFramebuffer();
	if (!framebuffer) {
		console.log('Failed to create frame buffer object');
		return error();
	}

	// Create a texture object and set its size and parameters
	texture = gl.createTexture(); // Create a texture object
	if (!texture) {
		console.log('Failed to create texture object');
		return error();
	}
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, OFFSCREEN_WIDTH, OFFSCREEN_HEIGHT, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

	// Create a renderbuffer object and Set its size and parameters
	depthBuffer = gl.createRenderbuffer(); // Create a renderbuffer object
	if (!depthBuffer) {
		console.log('Failed to create renderbuffer object');
		return error();
	}
	gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);
	gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, OFFSCREEN_WIDTH, OFFSCREEN_HEIGHT);

	// Attach the texture and the renderbuffer object to the FBO
	gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
	gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthBuffer);

	// Check if FBO is configured correctly
	var e = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
	if (gl.FRAMEBUFFER_COMPLETE !== e) {
		console.log('Frame buffer object is incomplete: ' + e.toString());
		return error();
	}

	framebuffer.texture = texture; // keep the required object

	// Unbind the buffer object
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	gl.bindTexture(gl.TEXTURE_2D, null);
	gl.bindRenderbuffer(gl.RENDERBUFFER, null);

	return framebuffer;
}

// var ANGLE_STEP = 20.0;
// var g_last = Date.now();
// function animate(angle)
// {
	// var now = Date.now();
	// var elapsed = now - g_last;
	// g_last = now;
	// var newAngle = angle + (ANGLE_STEP * elapsed) / 1000.0;
	// return newAngle %= 360;
// }


