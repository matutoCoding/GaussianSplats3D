// CPU reference implementation of the renderer's spherical-harmonics color
// evaluation. The polynomials and constants are kept byte-for-byte consistent
// with SplatMaterial.buildVertexShaderBase so the GPU and reference agree.

const SH_C1 = 0.4886025119029199;
const SH_C2 = [1.0925484, -1.0925484, 0.3153916, -1.0925484, 0.5462742];
const SH_C3 = [-0.5900436, 2.8906114, -0.4570458, 0.3731763, -0.4570458, 1.4453057, -0.5900436];

function clamp01(v) {
    return Math.max(0, Math.min(1, v));
}

// Evaluate the SH color addition for one splat given its FRC coefficients and
// a unit world-space view direction. `degree` selects how many bands contribute.
//
// frc:       array of 45 SH rest coefficients in the renderer's FRC layout
// degree:    0, 1, 2, or 3
// baseRgb:   [r,g,b] in 0..1 (the diffuse base color already decoded from f_dc)
// dir:       {x,y,z} unit vector, the SAME worldViewDir convention as the shader
// options.raw: when true, skip the final 0..1 clamp so rotation invariance can be
//              checked without saturation masking coefficient-level errors.
// returns:   {r,g,b}, clamped 0..1 unless options.raw is set
export function evaluateSH(frc, degree, baseRgb, dir, options = {}) {
    const wantClamp = !options.raw;
    const { x, y, z } = dir;
    let r = baseRgb[0];
    let g = baseRgb[1];
    let b = baseRgb[2];

    if (degree < 1) return wantClamp ? { r: clamp01(r), g: clamp01(g), b: clamp01(b) } : { r, g, b };

    // Degree 1: SH_C1 * (-sh1*y + sh2*z - sh3*x), each sh is an RGB vec3.
    const sh1 = [frc[0], frc[1], frc[2]];
    const sh2 = [frc[3], frc[4], frc[5]];
    const sh3 = [frc[6], frc[7], frc[8]];
    const basis1 = [-SH_C1 * y, SH_C1 * z, -SH_C1 * x];
    const shs1 = [sh1, sh2, sh3];
    const rgb1 = [r, g, b];
    for (let c = 0; c < 3; c++) {
        let add = 0;
        for (let k = 0; k < 3; k++) add += basis1[k] * shs1[k][c];
        rgb1[c] += add;
    }
    r = rgb1[0]; g = rgb1[1]; b = rgb1[2];

    if (degree < 2) return wantClamp ? { r: clamp01(r), g: clamp01(g), b: clamp01(b) } : { r, g, b };

    const xx = x * x, yy = y * y, zz = z * z;
    const xy = x * y, yz = y * z, xz = x * z;
    const sh4 = frc.slice(9, 12);
    const sh5 = frc.slice(12, 15);
    const sh6 = frc.slice(15, 18);
    const sh7 = frc.slice(18, 21);
    const sh8 = frc.slice(21, 24);
    const basis2 = [
        SH_C2[0] * xy,
        SH_C2[1] * yz,
        SH_C2[2] * (2 * zz - xx - yy),
        SH_C2[3] * xz,
        SH_C2[4] * (xx - yy)
    ];
    const shs2 = [sh4, sh5, sh6, sh7, sh8];
    for (let c = 0; c < 3; c++) {
        let add = 0;
        for (let k = 0; k < 5; k++) add += basis2[k] * shs2[k][c];
        if (c === 0) r += add; else if (c === 1) g += add; else b += add;
    }

    if (degree < 3) return wantClamp ? { r: clamp01(r), g: clamp01(g), b: clamp01(b) } : { r, g, b };

    const sh9 = frc.slice(24, 27);
    const sh10 = frc.slice(27, 30);
    const sh11 = frc.slice(30, 33);
    const sh12 = frc.slice(33, 36);
    const sh13 = frc.slice(36, 39);
    const sh14 = frc.slice(39, 42);
    const sh15 = frc.slice(42, 45);
    const basis3 = [
        SH_C3[0] * y * (3 * xx - yy),
        SH_C3[1] * xy * z,
        SH_C3[2] * y * (5 * zz - 1),
        SH_C3[3] * z * (5 * zz - 3),
        SH_C3[4] * x * (5 * zz - 1),
        SH_C3[5] * z * (xx - yy),
        SH_C3[6] * x * (xx - 3 * yy)
    ];
    const shs3 = [sh9, sh10, sh11, sh12, sh13, sh14, sh15];
    for (let c = 0; c < 3; c++) {
        let add = 0;
        for (let k = 0; k < 7; k++) add += basis3[k] * shs3[k][c];
        if (c === 0) r += add; else if (c === 1) g += add; else b += add;
    }

    return wantClamp ? { r: clamp01(r), g: clamp01(g), b: clamp01(b) } : { r, g, b };
}
