import {
	translation,
	yRotate,
	inverse,
	multiply,
	perspective,
} from "./utils/matrix";

import createProgram from "./utils/createProgram";
import fragmentShader from "./shaders/fragmentShader.glsl?raw";
import vertexShader from "./shaders/vertexShader.glsl?raw";
import createShader from "./utils/createShader";
import { CUBE_FLOAT_COUNT, fillBufferWithCubeVertices } from "./utils/positionBufferHelpers";
import {
	VERTICES_PER_QUAD,
	COLOR_COMPONENTS_PER_QUAD,
	setQuadColor,
	fillBufferWithQuadIndices,
} from "./utils/colorBufferHelpers";

function main() {
	const canvas = document.getElementById("canvas") as HTMLCanvasElement;
	const gl = canvas.getContext("webgl");

	const program = createProgram(gl, [
		createShader(gl, vertexShader, gl.VERTEX_SHADER),
		createShader(gl, fragmentShader, gl.FRAGMENT_SHADER),
	]);

	const positionLocation = gl.getAttribLocation(program, "a_position");
	const quadIndexLocation = gl.getAttribLocation(program, "a_quadIndex");
	const matrixLocation = gl.getUniformLocation(program, "u_matrix");
	const quadColorsLocation = gl.getUniformLocation(program, "u_quadColors[0]");
	const paletteSizeLocation = gl.getUniformLocation(program, "u_paletteSize");

	if (quadIndexLocation === -1) {
		throw new Error("Failed to locate attribute a_quadIndex");
	}

	if (!quadColorsLocation || !paletteSizeLocation) {
		throw new Error("Failed to locate quad color uniforms");
	}

	const positionBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

	const positions = new Float32Array(CUBE_FLOAT_COUNT * 3);
	fillBufferWithCubeVertices(positions, 0, 100);
	fillBufferWithCubeVertices(positions, CUBE_FLOAT_COUNT, 50, [0, 100, 0]);
	fillBufferWithCubeVertices(positions, CUBE_FLOAT_COUNT * 2, 50, [100, 0, 0]);
	gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

	const vertexCount = positions.length / 3;
	const quadCount = vertexCount / VERTICES_PER_QUAD;
	
	const quadIndexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, quadIndexBuffer);
	setQuadIndices(gl, quadCount);

	const quadPalette = createQuadPalette(quadCount);

	let cameraAngleRadians = Math.PI;
	const fieldOfViewRadians = Math.PI / 2;

	const cameraPosY = 0;
	let cameraPosX = 0;
	let cameraPosZ = -20;

	const moveStep = 1;

	window.addEventListener("keydown", (event) => {
		let fwdBack = 0;
		let strafe = 0;

		event.preventDefault();

		switch (event.code) {
			case "ArrowUp":
				fwdBack = -1;
				break;
			case "ArrowDown":
				fwdBack = +1;
				break
			case "ArrowRight":
				strafe = +1;
				break;
			case "ArrowLeft":
				strafe = -1;
				break;
			case "KeyA":
				cameraAngleRadians += 0.1;
				break;
			case "KeyD":
				cameraAngleRadians -= 0.1;
				break;
			default:
				return;
		}

		// Camera's local basis on the XZ plane
		const forwardX = Math.sin(cameraAngleRadians);
		const forwardZ = Math.cos(cameraAngleRadians);
		const rightX = Math.cos(cameraAngleRadians);
		const rightZ = -Math.sin(cameraAngleRadians);

		// Normalize diagonals so speed is constant
		if (fwdBack && strafe) {
			const inv = 1 / Math.sqrt(2);
			fwdBack *= inv;
			strafe *= inv;
		}

		cameraPosX += (forwardX * fwdBack + rightX * strafe) * moveStep;
		cameraPosZ += (forwardZ * fwdBack + rightZ * strafe) * moveStep;
	});

	// Draw the scene.
	function drawScene() {
		gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		gl.enable(gl.CULL_FACE);
		gl.enable(gl.DEPTH_TEST);
		gl.useProgram(program);
		gl.enableVertexAttribArray(positionLocation);
		gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
		gl.vertexAttribPointer(
			positionLocation,
			3,
			gl.FLOAT,
			false,
			0,
			0,
		);
		gl.enableVertexAttribArray(quadIndexLocation);
		gl.bindBuffer(gl.ARRAY_BUFFER, quadIndexBuffer);
		gl.vertexAttribPointer(
			quadIndexLocation,
			1,
			gl.UNSIGNED_BYTE,
			false,
			0,
			0,
		);

		// Compute the projection matrix
		const aspect = canvas.clientWidth / canvas.clientHeight;
		const zNear = 1;
		const zFar = 2000;
		const projectionMatrix = perspective(fieldOfViewRadians, aspect, zNear, zFar);

		// Compute a matrix for the camera
		let cameraMatrix = translation(
			cameraPosX * 10,
			cameraPosY * 10,
			cameraPosZ * 10,
		);
		cameraMatrix = yRotate(cameraMatrix, cameraAngleRadians);

		// Make a view matrix from the camera matrix
		const viewMatrix = inverse(cameraMatrix);

		// Compute a view projection matrix
		const viewProjectionMatrix = multiply(projectionMatrix, viewMatrix);

		gl.uniformMatrix4fv(matrixLocation, false, viewProjectionMatrix);
		gl.uniform3fv(quadColorsLocation, quadPalette);
		gl.uniform1f(paletteSizeLocation, quadCount);
		gl.drawArrays(gl.TRIANGLES, 0, vertexCount);
		window.requestAnimationFrame(drawScene);
	}

	drawScene();
}

function setQuadIndices(gl: WebGLRenderingContext, quadCount: number) {
	const data = new Uint8Array(quadCount * VERTICES_PER_QUAD);
	for (let quad = 0; quad < quadCount; quad += 1) {
		fillBufferWithQuadIndices(data, quad, quad * VERTICES_PER_QUAD);
	}
	gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
}

function createQuadPalette(quadCount: number): Float32Array {
	const palette = new Float32Array(quadCount * COLOR_COMPONENTS_PER_QUAD);
	const baseColors: Array<[number, number, number]> = [
		[200, 70, 20],
		[20, 200, 70],
		[70, 20, 200],
		[200, 200, 70],
		[210, 100, 70],
		[70, 200, 210],
	];

	for (let quad = 0; quad < quadCount; quad += 1) {
		const color = baseColors[quad % baseColors.length];
		setQuadColor(palette, quad, color[0], color[1], color[2]);
	}

	return palette;
}

main();
