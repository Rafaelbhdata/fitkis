// Minimal stub for next/server used in Jest tests.
// Only NextResponse is needed (route handlers use it); the pure validator
// being tested does not interact with HTTP at all.
const NextResponse = {
  json: (body, init) => ({ body, init }),
}

module.exports = { NextResponse }
