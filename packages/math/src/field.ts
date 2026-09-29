/**
 * @grahan/math — Galois Field Arithmetic
 *
 * Provides finite field implementations for GF(p) where p is prime,
 * and GF(4) constructed via irreducible polynomial x² + x + 1 over GF(2).
 *
 * All arithmetic operations return elements in [0, q-1].
 */

// ─── Field Interface ─────────────────────────────────────────────────────────

export interface Field {
  /** Order of the field (number of elements) */
  readonly order: number;

  /** Addition: (a + b) in GF(q) */
  add(a: number, b: number): number;

  /** Subtraction: (a - b) in GF(q) */
  sub(a: number, b: number): number;

  /** Multiplication: (a * b) in GF(q) */
  mul(a: number, b: number): number;

  /** Multiplicative inverse: a^(-1) such that a * a^(-1) = 1. Undefined for a = 0. */
  inv(a: number): number;

  /** Additive inverse: -a such that a + (-a) = 0 */
  neg(a: number): number;

  /** All elements of the field [0, 1, ..., q-1] */
  elements(): number[];
}

// ─── GF(p) for prime p ───────────────────────────────────────────────────────

/**
 * Constructs GF(p) — modular arithmetic over Z_p for prime p.
 * Used for p = 3 (Grahan-3) and p = 5 (Grahan-5).
 */
export function gfPrime(p: number): Field {
  // Precompute multiplicative inverses using extended Euclidean / brute force for small p
  const inverses = new Array<number>(p);
  inverses[0] = NaN; // 0 has no multiplicative inverse
  for (let a = 1; a < p; a++) {
    for (let b = 1; b < p; b++) {
      if ((a * b) % p === 1) {
        inverses[a] = b;
        break;
      }
    }
  }

  return {
    order: p,

    add(a: number, b: number): number {
      return ((a + b) % p + p) % p;
    },

    sub(a: number, b: number): number {
      return ((a - b) % p + p) % p;
    },

    mul(a: number, b: number): number {
      return ((a * b) % p + p) % p;
    },

    inv(a: number): number {
      if (a === 0) throw new Error('No multiplicative inverse for 0');
      return inverses[a];
    },

    neg(a: number): number {
      return (p - a) % p;
    },

    elements(): number[] {
      return Array.from({ length: p }, (_, i) => i);
    },
  };
}

// ─── GF(4) via irreducible polynomial x² + x + 1 over GF(2) ─────────────────

/**
 * Constructs GF(4) = GF(2)[x] / <x² + x + 1>.
 *
 * Elements encoded as 2-bit integers:
 *   0 = 0, 1 = 1, 2 = α, 3 = α + 1
 *
 * Addition: bitwise XOR (polynomial addition over GF(2)).
 * Multiplication: via lookup table derived from α² = α + 1.
 */
export function gf4(): Field {
  const q = 4;

  // Multiplication table for GF(4)
  // α² = α + 1, so:
  //   0*x = 0
  //   1*x = x
  //   α * α = α + 1 = 3
  //   α * (α+1) = α² + α = (α+1) + α = 1
  //   (α+1) * (α+1) = α² + 2α + 1 = α² + 1 = (α+1)+1 = α = 2
  const mulTable: number[][] = [
    [0, 0, 0, 0],
    [0, 1, 2, 3],
    [0, 2, 3, 1],
    [0, 3, 1, 2],
  ];

  // Inverse table: a * inv[a] = 1
  const invTable = [NaN, 1, 3, 2];

  return {
    order: q,

    add(a: number, b: number): number {
      return a ^ b; // XOR for GF(2^k)
    },

    sub(a: number, b: number): number {
      return a ^ b; // In characteristic 2, addition = subtraction
    },

    mul(a: number, b: number): number {
      return mulTable[a][b];
    },

    inv(a: number): number {
      if (a === 0) throw new Error('No multiplicative inverse for 0');
      return invTable[a];
    },

    neg(a: number): number {
      return a; // In characteristic 2, -a = a
    },

    elements(): number[] {
      return [0, 1, 2, 3];
    },
  };
}
