// Exact mirror of SplatBuffer.rotateSphericalHarmonics5's l=2 block construction
// and the l=1 block setup, for validating alternative rotation implementations.

function l1BlockFromMatrix3(m3) {
    const tsh11 = [m3.elements[4], -m3.elements[7], m3.elements[1]];
    const tsh12 = [-m3.elements[5], m3.elements[8], -m3.elements[2]];
    const tsh13 = [m3.elements[3], -m3.elements[6], m3.elements[0]];
    return [tsh11, tsh12, tsh13];
}

function hardCodedL2Block(tsh11, tsh12, tsh13) {
    const kSqrt0104 = Math.sqrt(1 / 4), kSqrt0304 = Math.sqrt(3 / 4),
          kSqrt0103 = Math.sqrt(1 / 3), kSqrt0403 = Math.sqrt(4 / 3), kSqrt0112 = Math.sqrt(1 / 12);
    const tsh21 = [], tsh22 = [], tsh23 = [], tsh24 = [], tsh25 = [];
    tsh21[0] = kSqrt0104 * ((tsh13[2] * tsh11[0] + tsh13[0] * tsh11[2]) + (tsh11[2] * tsh13[0] + tsh11[0] * tsh13[2]));
    tsh21[1] = (tsh13[1] * tsh11[0] + tsh11[1] * tsh13[0]);
    tsh21[2] = kSqrt0304 * (tsh13[1] * tsh11[1] + tsh11[1] * tsh13[1]);
    tsh21[3] = (tsh13[1] * tsh11[2] + tsh11[1] * tsh13[2]);
    tsh21[4] = kSqrt0104 * ((tsh13[2] * tsh11[2] - tsh13[0] * tsh11[0]) + (tsh11[2] * tsh13[2] - tsh11[0] * tsh13[0]));
    tsh22[0] = kSqrt0104 * ((tsh12[2] * tsh11[0] + tsh12[0] * tsh11[2]) + (tsh11[2] * tsh12[0] + tsh11[0] * tsh12[2]));
    tsh22[1] = tsh12[1] * tsh11[0] + tsh11[1] * tsh12[0];
    tsh22[2] = kSqrt0304 * (tsh12[1] * tsh11[1] + tsh11[1] * tsh12[1]);
    tsh22[3] = tsh12[1] * tsh11[2] + tsh11[1] * tsh12[2];
    tsh22[4] = kSqrt0104 * ((tsh12[2] * tsh11[2] - tsh12[0] * tsh11[0]) + (tsh11[2] * tsh12[2] - tsh11[0] * tsh12[0]));
    tsh23[0] = kSqrt0103 * (tsh12[2] * tsh12[0] + tsh12[0] * tsh12[2]) + -kSqrt0112 *
               ((tsh13[2] * tsh13[0] + tsh13[0] * tsh13[2]) + (tsh11[2] * tsh11[0] + tsh11[0] * tsh11[2]));
    tsh23[1] = kSqrt0403 * tsh12[1] * tsh12[0] + -kSqrt0103 * (tsh13[1] * tsh13[0] + tsh11[1] * tsh11[0]);
    tsh23[2] = tsh12[1] * tsh12[1] + -kSqrt0104 * (tsh13[1] * tsh13[1] + tsh11[1] * tsh11[1]);
    tsh23[3] = kSqrt0403 * tsh12[1] * tsh12[2] + -kSqrt0103 * (tsh13[1] * tsh13[2] + tsh11[1] * tsh11[2]);
    tsh23[4] = kSqrt0103 * (tsh12[2] * tsh12[2] - tsh12[0] * tsh12[0]) + -kSqrt0112 *
               ((tsh13[2] * tsh13[2] - tsh13[0] * tsh13[0]) + (tsh11[2] * tsh11[2] - tsh11[0] * tsh11[0]));
    tsh24[0] = kSqrt0104 * ((tsh12[2] * tsh13[0] + tsh12[0] * tsh13[2]) + (tsh13[2] * tsh12[0] + tsh13[0] * tsh12[2]));
    tsh24[1] = tsh12[1] * tsh13[0] + tsh13[1] * tsh12[0];
    tsh24[2] = kSqrt0304 * (tsh12[1] * tsh13[1] + tsh13[1] * tsh12[1]);
    tsh24[3] = tsh12[1] * tsh13[2] + tsh13[1] * tsh12[2];
    tsh24[4] = kSqrt0104 * ((tsh12[2] * tsh13[2] - tsh12[0] * tsh13[0]) + (tsh13[2] * tsh12[2] - tsh13[0] * tsh12[0]));
    tsh25[0] = kSqrt0104 * ((tsh13[2] * tsh13[0] + tsh13[0] * tsh13[2]) - (tsh11[2] * tsh11[0] + tsh11[0] * tsh11[2]));
    tsh25[1] = (tsh13[1] * tsh13[0] - tsh11[1] * tsh11[0]);
    tsh25[2] = kSqrt0304 * (tsh13[1] * tsh13[1] - tsh11[1] * tsh11[1]);
    tsh25[3] = (tsh13[1] * tsh13[2] - tsh11[1] * tsh11[2]);
    tsh25[4] = kSqrt0104 * ((tsh13[2] * tsh13[2] - tsh13[0] * tsh13[0]) - (tsh11[2] * tsh11[2] - tsh11[0] * tsh11[0]));
    return [tsh21, tsh22, tsh23, tsh24, tsh25];
}

export { hardCodedL2Block, l1BlockFromMatrix3 };
