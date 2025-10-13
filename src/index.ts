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
import { CUBE_FLOAT_COUNT, CUBE_VERTEX_COUNT } from "./utils/positionBufferHelpers";
import { VERTICES_PER_QUAD } from "./utils/colorBufferHelpers";
import {
	TEX_COORD_COMPONENTS_PER_VERTEX,
	UV_COMPONENTS_PER_QUAD,
	expandQuadUVRects,
} from "./utils/textureBufferHelpers";
import { createTexturedCube, QUADS_PER_CUBE } from "./utils/createTexturedCube";

async function main() {
	const canvas = document.getElementById("canvas") as HTMLCanvasElement | null;
	const textureImage = document.getElementById("texture") as HTMLImageElement | null;

	if (!canvas) {
		throw new Error("Canvas element with id 'canvas' was not found");
	}

	if (!textureImage) {
		throw new Error("Texture image with id 'texture' was not found");
	}

	await ensureImageReady(textureImage);

	const gl = canvas.getContext("webgl");

	if (!gl) {
		throw new Error("WebGL not supported in this browser");
	}

	const program = createProgram(gl, [
		createShader(gl, vertexShader, gl.VERTEX_SHADER),
		createShader(gl, fragmentShader, gl.FRAGMENT_SHADER),
	]);

	const positionLocation = gl.getAttribLocation(program, "a_position");
	const texCoordLocation = gl.getAttribLocation(program, "a_texCoord");
	const uvRectLocation = gl.getAttribLocation(program, "a_uvRect");
	const matrixLocation = gl.getUniformLocation(program, "u_matrix");
	const textureLocation = gl.getUniformLocation(program, "u_texture");

	if (positionLocation === -1) {
		throw new Error("Failed to locate attribute a_position");
	}

	if (texCoordLocation === -1) {
		throw new Error("Failed to locate attribute a_texCoord");
	}

	if (uvRectLocation === -1) {
		throw new Error("Failed to locate attribute a_uvRect");
	}

	if (!matrixLocation || !textureLocation) {
		throw new Error("Failed to locate shader uniforms");
	}
	const positionBuffer = gl.createBuffer();
	if (!positionBuffer) {
		throw new Error("Failed to create position buffer");
	}

	const texCoordBuffer = gl.createBuffer();
	if (!texCoordBuffer) {
		throw new Error("Failed to create texture coordinate buffer");
	}

	const quadUVRectBuffer = gl.createBuffer();
	if (!quadUVRectBuffer) {
		throw new Error("Failed to create UV rect buffer");
	}

	type CubeDefinition = {
		size: number;
		center?: [number, number, number];
		textureTopLeft: [number, number];
		textureSize: [number, number];
	};

	const halfTexture = 0.5;
	const cubes: CubeDefinition[] = [
		{
			size: 100,
			textureTopLeft: [0, 0],
			textureSize: [1, 1],
		},
		{
			size: 50,
			center: [0, 100, 0],
			textureTopLeft: [halfTexture, 0],
			textureSize: [halfTexture, halfTexture],
		},
		{
			size: 50,
			center: [100, 0, 0],
			textureTopLeft: [0, halfTexture],
			textureSize: [halfTexture, halfTexture],
		},
	];

	const cubeCount = cubes.length;
	const quadCount = cubeCount * QUADS_PER_CUBE;
	const vertexCount = cubeCount * CUBE_VERTEX_COUNT;

	const positions = new Float32Array(cubeCount * CUBE_FLOAT_COUNT);
	const texCoords = new Float32Array(
		quadCount * VERTICES_PER_QUAD * TEX_COORD_COMPONENTS_PER_VERTEX,
	);
	const quadUVRects = new Float32Array(quadCount * UV_COMPONENTS_PER_QUAD);

	cubes.forEach((cube, cubeIndex) => {
		createTexturedCube({
			positions,
			texCoords,
			quadUVRects,
			cubeIndex,
			size: cube.size,
			center: cube.center,
			textureTopLeft: cube.textureTopLeft,
			textureSize: cube.textureSize,
		});
	});

	gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

	gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);

	uploadQuadUVRectBuffer(gl, quadUVRectBuffer, quadUVRects, quadCount);

	const texture = gl.createTexture();
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textureImage);

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
				break;
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

		const forwardX = Math.sin(cameraAngleRadians);
		const forwardZ = Math.cos(cameraAngleRadians);
		const rightX = Math.cos(cameraAngleRadians);
		const rightZ = -Math.sin(cameraAngleRadians);

		if (fwdBack && strafe) {
			const inv = 1 / Math.sqrt(2);
			fwdBack *= inv;
			strafe *= inv;
		}

		cameraPosX += (forwardX * fwdBack + rightX * strafe) * moveStep;
		cameraPosZ += (forwardZ * fwdBack + rightZ * strafe) * moveStep;
	});

	function drawScene() {
		const displayWidth = canvas.clientWidth;
		const displayHeight = canvas.clientHeight;

		if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
			canvas.width = displayWidth;
			canvas.height = displayHeight;
		}

		gl.viewport(0, 0, canvas.width, canvas.height);
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

		gl.enableVertexAttribArray(texCoordLocation);
		gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
		gl.vertexAttribPointer(
			texCoordLocation,
			2,
			gl.FLOAT,
			false,
			0,
			0,
		);

		gl.enableVertexAttribArray(uvRectLocation);
		gl.bindBuffer(gl.ARRAY_BUFFER, quadUVRectBuffer);
		gl.vertexAttribPointer(
			uvRectLocation,
			4,
			gl.FLOAT,
			false,
			0,
			0,
		);

		const aspect = canvas.width / canvas.height;
		const zNear = 1;
		const zFar = 2000;
		const projectionMatrix = perspective(fieldOfViewRadians, aspect, zNear, zFar);

		let cameraMatrix = translation(
			cameraPosX * 10,
			cameraPosY * 10,
			cameraPosZ * 10,
		);
		cameraMatrix = yRotate(cameraMatrix, cameraAngleRadians);

		const viewMatrix = inverse(cameraMatrix);
		const viewProjectionMatrix = multiply(projectionMatrix, viewMatrix);

		gl.uniformMatrix4fv(matrixLocation, false, viewProjectionMatrix);
		gl.uniform1i(textureLocation, 0);
		gl.drawArrays(gl.TRIANGLES, 0, vertexCount);
		window.requestAnimationFrame(drawScene);
	}

	drawScene();
}

function uploadQuadUVRectBuffer(
	gl: WebGLRenderingContext,
	buffer: WebGLBuffer,
	quadUVRects: Float32Array,
	quadCount: number,
): void {
	const expanded = expandQuadUVRects(quadUVRects, quadCount);
	gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
	gl.bufferData(gl.ARRAY_BUFFER, expanded, gl.DYNAMIC_DRAW);
}

async function ensureImageReady(image: HTMLImageElement): Promise<void> {
	if (image.complete && image.naturalWidth !== 0) {
		return;
	}

	if (typeof image.decode === "function") {
		await image.decode();
		return;
	}

	await new Promise<void>((resolve, reject) => {
		const cleanup = () => {
			image.removeEventListener("load", handleLoad);
			image.removeEventListener("error", handleError);
		};

		const handleLoad = () => {
			cleanup();
			resolve();
		};

		const handleError = () => {
			cleanup();
			reject(new Error("Failed to load texture image"));
		};

		image.addEventListener("load", handleLoad);
		image.addEventListener("error", handleError);
	});
}

main().catch((error) => {
	console.error(error);
});
