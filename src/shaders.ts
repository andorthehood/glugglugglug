export const PALETTE_CAPACITY = 256;

export const vertexShaderSource = `#version 300 es
	precision highp float;
	precision highp int;

	layout(location = 0) in vec4 a_rectangle;
	layout(location = 1) in uvec2 a_spriteAndPalette;

	uniform vec2 u_resolution;
	uniform vec2 u_atlasSize;
	uniform highp usampler2D u_spriteRectangles;
	layout(std140) uniform Palette {
		vec4 u_palette[${PALETTE_CAPACITY}];
	};

	out vec2 v_textureCoordinate;
	flat out vec4 v_color;

	const vec2 CORNERS[4] = vec2[](
		vec2(0.0, 0.0),
		vec2(1.0, 0.0),
		vec2(0.0, 1.0),
		vec2(1.0, 1.0)
	);

	void main() {
		vec2 corner = CORNERS[gl_VertexID];
		v_color = u_palette[a_spriteAndPalette.y];
		uvec4 spriteRectangle = texelFetch(u_spriteRectangles, ivec2(int(a_spriteAndPalette.x), 0), 0);

		vec2 pixelPosition = a_rectangle.xy + corner * a_rectangle.zw;
		vec2 clipPosition = pixelPosition / u_resolution * 2.0 - 1.0;
		gl_Position = vec4(clipPosition * vec2(1.0, -1.0), 0.0, 1.0);

		vec2 atlasPixel = vec2(spriteRectangle.xy) + corner * vec2(spriteRectangle.zw);
		v_textureCoordinate = atlasPixel / u_atlasSize;
	}
`;

export const fragmentShaderSource = `#version 300 es
	precision mediump float;

	in vec2 v_textureCoordinate;
	flat in vec4 v_color;
	uniform sampler2D u_atlas;

	out vec4 outColor;

	void main() {
		outColor = v_color * texture(u_atlas, v_textureCoordinate).r;
	}
`;
