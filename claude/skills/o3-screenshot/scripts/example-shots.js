// Example: patient banner, vitals table, and the visit note workspace from one session.
// Copy this file to the session scratchpad, edit it, and run it with `node <file> [out-dir]`.
const path = require('path');
const { captureShots } = require(path.join(process.env.HOME, '.claude/skills/o3-screenshot/scripts/screenshot'));

const BASE = 'http://localhost';
const PATIENT = '968f6ebe-769e-43cc-9023-c77414ebc986';

captureShots({
  baseUrl: BASE,
  login: { username: 'admin', password: 'Admin123', location: 'Outpatient Clinic' },
  startPath: `/openmrs/spa/patient/${PATIENT}/chart/Patient%20Summary`,
  outDir: process.argv[2] ?? 'shots',

  shots: [
    { name: 'banner', crop: 'header[aria-label="patient banner"]', padding: 0 },
    { name: 'vitals-table', crop: '.cds--data-table-container', padding: 0 },
    {
      name: 'visit-note',
      before: (page) => page.getByRole('button', { name: 'Visit note' }).first().click(),
      wait: 'form.cds--form',
      // Workspace column from below the top nav (48px) to the bottom of the form
      crop: (page) =>
        page.evaluate(() => {
          const form = document.querySelector('form.cds--form').getBoundingClientRect();
          return { x: form.x, y: 48, width: form.width, height: form.bottom - 48 };
        }),
      padding: 0,
    },
  ],
}).then((r) => console.log(r));
