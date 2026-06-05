const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));

async function main() {
  const session = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'sndprintmedia@gmail.com', password: 'TestPass123' })
  });
  const loginJson = await session.json();
  console.log('Login:', session.status, loginJson);
  const cookie = session.headers.get('set-cookie');
  console.log('Cookie:', cookie);

  if (!cookie) {
    console.log('No cookie, exiting');
    return;
  }

  const cookieValue = cookie.split(';')[0];

  const tests = [
    { name: 'P1: no-op (valid data)', body: { username: 'recmar', enrollmentStatus: 'enrolled', parentEmail: 'julitoisod061703@gmail.com' } },
    { name: 'P2: bad username (special char)', body: { username: 'recmar!', enrollmentStatus: 'enrolled' } },
    { name: 'P3: bad enrollment status', body: { enrollmentStatus: 'banana' } },
    { name: 'P4: bad parent email', body: { parentEmail: 'not-an-email' } },
    { name: 'P5: empty body', body: {} },
    { name: 'P6: short password', body: { password: 'abc' } },
    { name: 'P7: password no number', body: { password: 'abcdefgh' } },
    { name: 'P8: password no letter', body: { password: '12345678' } },
    { name: 'P9: empty parent email (should clear)', body: { parentEmail: '' } },
    { name: 'P10: only username (2 chars)', body: { username: 're' } },
    { name: 'P11: only username (33 chars)', body: { username: 'r'.repeat(33) } },
    { name: 'P12: try enrolling (should work)', body: { enrollmentStatus: 'enrolled' } },
  ];

  for (const t of tests) {
    const r = await fetch('http://localhost:3000/api/teacher/students/41', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Cookie': cookieValue },
      body: JSON.stringify(t.body)
    });
    const j = await r.json().catch(() => null);
    console.log(`${t.name}: ${r.status} ${j?.success ? 'OK' : 'FAIL'} - ${j?.message || JSON.stringify(j)}`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
