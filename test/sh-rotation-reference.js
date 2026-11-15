// Spherical-harmonics rotation blocks by direct numerical integration on S^2,
// using the EXACT basis polynomials and constants from SplatMaterial.js so the
// resulting blocks share the renderer's convention with zero guesswork.
//
// Renderer basis (see buildVertexShaderBase):
//   l=1:  f = SH_C1 * (-sh1*y + sh2*z - sh3*x)
//   l=2:  f += (SH_C2[0]*xy) sh4 + (SH_C2[1]*yz) sh5
//             + (SH_C2[2]*(2z^2-x^2-y^2)) sh6
//             + (SH_C2[3]*xz) sh7 + (SH_C2[4]*(x^2-y^2)) sh8
//   l=0:  constant
//
// We treat each distinct polynomial (with its SH constant folded in) as one
// basis function and integrate <b_mp(n), b_m(R^-1 n)> over the sphere. Because
// every band is a scaled orthonormal SH basis, the integral yields the rotation
// block with consistent scaling; rotation within a band only depends on the
// polynomial directions, not the common normalization.

const SH_C1 = 0.4886025119029199;
const SH_C2 = [1.0925484, -1.0925484, 0.3153916, -1.0925484, 0.5462742];
// Standard l=3 real SH constants matching the renderer's convention family.
const SH_C3 = [-0.5900436, 2.8906114, -0.4570458, 0.3731763, -0.4570458, 1.4453057, -0.5900436];

// Basis polynomial for FRC slot index within a band, evaluated on (x,y,z).
// l1Index: 0..2 (sh1,sh2,sh3); l2Index: 0..4 (sh4..sh8); l3Index: 0..6 (sh9..sh15).
function basisL1(i, x, y, z) {
    if (i === 0) return -SH_C1 * y;
    if (i === 1) return SH_C1 * z;
    return -SH_C1 * x;
}
function basisL2(i, x, y, z) {
    if (i === 0) return SH_C2[0] * x * y;
    if (i === 1) return SH_C2[1] * y * z;
    if (i === 2) return SH_C2[2] * (2 * z * z - x * x - y * y);
    if (i === 3) return SH_C2[3] * x * z;
    return SH_C2[4] * (x * x - y * y);
}
// l=3 real SH polynomials (m = -3..+3 order), standard forms.
function basisL3(i, x, y, z) {
    const xx = x * x, yy = y * y, zz = z * z;
    if (i === 0) return SH_C3[0] * y * (3 * xx - yy);
    if (i === 1) return SH_C3[1] * x * y * z;
    if (i === 2) return SH_C3[2] * y * (5 * zz - 1);
    if (i === 3) return SH_C3[3] * z * (5 * zz - 3);
    if (i === 4) return SH_C3[4] * x * (5 * zz - 1);
    if (i === 5) return SH_C3[5] * z * (xx - yy);
    return SH_C3[6] * x * (xx - 3 * yy);
}
function basisForDegree(degree) {
    if (degree === 1) return basisL1;
    if (degree === 2) return basisL2;
    return basisL3;
}

function matVec(R, v) {
    return [
        R[0][0] * v[0] + R[0][1] * v[1] + R[0][2] * v[2],
        R[1][0] * v[0] + R[1][1] * v[1] + R[1][2] * v[2],
        R[2][0] * v[0] + R[2][1] * v[1] + R[2][2] * v[2]
    ];
}

// Real rotation block for a degree via Fibonacci-lattice sphere integration.
function rotationMatrixForDegree(R, degree, sampleCount = 60000) {
    const size = 2 * degree + 1;
    const basis = basisForDegree(degree);
    const block = Array.from({ length: size }, () => new Array(size).fill(0));
    const golden = Math.PI * (3 - Math.sqrt(5));
    const weight = 4 * Math.PI / sampleCount;
    // rotation inverse = transpose
    const Rinv = [
        [R[0][0], R[1][0], R[2][0]],
        [R[0][1], R[1][1], R[2][1]],
        [R[0][2], R[1][2], R[2][2]]
    ];

    for (let s = 0; s < sampleCount; s++) {
        const y = 1 - (s + 0.5) / sampleCount * 2;
        const radius = Math.sqrt(Math.max(0, 1 - y * y));
        const theta = golden * s;
        const x = Math.cos(theta) * radius;
        const z = Math.sin(theta) * radius;
        const rp = matVec(Rinv, [x, y, z]);

        for (let a = 0; a < size; a++) {
            const va = basis(a, x, y, z);
            for (let b = 0; b < size; b++) {
                block[a][b] += va * basis(b, rp[0], rp[1], rp[2]) * weight;
            }
        }
    }
    return block;
}

export { rotationMatrixForDegree, basisL1, basisL2, basisL3, SH_C3 };
