export const PALETTE_CAPACITY = 256;

export const vertexShaderSource = `#version 300 es
	precision highp float;
	precision highp int;

	layout(location = 0) in vec4 a_rectangle;
	layout(location = 1) in uvec2 a_spriteAndPalette;

	uniform vec2 u_pixelToClip;
	uniform vec2 u_atlasSize;
	uniform vec2 u_cellSize;
	uniform uint u_columns;
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
		uint cellId = a_spriteAndPalette.x;
		uvec2 cell = uvec2(cellId % u_columns, cellId / u_columns);

		vec2 pixelPosition = a_rectangle.xy + corner * a_rectangle.zw;
		gl_Position = vec4(pixelPosition * u_pixelToClip + vec2(-1.0, 1.0), 0.0, 1.0);

		vec2 atlasPixel = (vec2(cell) + corner) * u_cellSize;
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
		float mask = texture(u_atlas, v_textureCoordinate).r;
		if (mask == 0.0 || v_color.a == 0.0) discard;
		outColor = v_color;
	}
`;
