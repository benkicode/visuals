// Diffie-Hellman key agreement: the math and the per-level scene/step logs the
// visualization replays. Named exports only (repo convention). Small textbook
// numbers (p = 23, g = 5) keep every value on a split-flap and the modular
// arithmetic within Number precision.
//
// DH is the modern key exchange (TLS 1.3, SSH): both sides derive the SAME
// shared secret g^(ab) mod p without ever transmitting it, and an eavesdropper
// who sees g, p, A and B still can't recover it (the discrete-log problem).

export function modpow(base, exp, m) {
  let result = 1;
  base %= m;
  while (exp > 0) {
    if (exp & 1) result = (result * base) % m;
    base = (base * base) % m;
    exp = Math.floor(exp / 2);
  }
  return result;
}

export function buildDh({ p = 23, g = 2, a = 6, b = 15 } = {}) {
  const A = modpow(g, a, p); // Alice's public value
  const B = modpow(g, b, p); // Bob's public value
  const sharedA = modpow(B, a, p); // Alice: Bᵃ mod p
  const sharedB = modpow(A, b, p); // Bob:   Aᵇ mod p
  return { p, g, a, b, A, B, sharedA, sharedB, shared: sharedA };
}

// The four zoom levels, each an ordered step list. A step may write a narration
// line, `set` flap-number fields, light `edges`, add `classes` to the panel's
// state (driving CSS), or flag the `symmetric` handoff. HTTPS only for now.
export function buildScenes() {
  const dh = buildDh();
  const group = "ffdhe2048"; // the HTTPS finite-field group, named at the top level

  // The handshake, observed in a browser (TLS 1.3 order): http → keygen → key
  // shares in the clear (ClientHello/ServerHello) → both derive the shared
  // secret → TLS up under a symmetric cipher. Server authentication (proving the
  // server is really example.com — the certificate) is a separate concern, out
  // of scope here; the browser just notes it once the channel is up.
  const handshake = [
    { narration: "You open http://example.com — an open connection anyone on the path can read.", classes: ["s-open"], focus: ".browserbar" },
    { narration: `Each side generates a random private key and derives its public key from it (gᵃ mod p). a = ${dh.a} and b = ${dh.b} are just random numbers.`, set: { caSecret: dh.a, caPub: dh.A, sbSecret: dh.b, sbPub: dh.B }, classes: ["s-keygen"], focus: ".area-kgc" },
    { narration: `ClientHello — the browser sends its public key A = ${dh.A} and the groups it supports (${group}). In the clear.`, set: { chPub: dh.A }, classes: ["s-hello"], focus: ".area-ch" },
    { narration: `ServerHello — the server replies with its public key B = ${dh.B}. Also in the clear — key shares aren't secret.`, set: { shPub: dh.B }, classes: ["s-reply"], focus: ".area-sh" },
    { narration: `Eve saw A = ${dh.A} and B = ${dh.B} cross the wire, but recovering a or b is the discrete-log wall.`, classes: ["s-eve"], focus: ".area-eve" },
    { narration: `Both sides now derive the same shared secret — ${dh.shared} — which never crossed the wire. From here on, everything is encrypted with it.`, set: { cDerive: dh.shared, sDerive: dh.shared }, classes: ["s-derive"], focus: ".area-derivegroup" },
    { narration: `TLS is up: the padlock closes, http becomes https, and data flows under a fast symmetric cipher (${group}, AES-128-GCM). (Who the server is gets authenticated separately, by its certificate.)`, classes: ["s-secure"], symmetric: true, focus: ".sym" },
  ];

  return { dh, steps: handshake };
}
