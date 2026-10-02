// Example: openmrs-esm-patient-chart PR 3621, diagnosis rows reorder under the pointer.
// Copy this file to the session scratchpad, edit it, and run it with `node <file>`.
const path = require('path');
const { recordScenario } = require(path.join(process.env.HOME, '.claude/skills/o3-screencast/scripts/screencast'));

const BASE = 'http://localhost:8130';
const PATIENT = '968f6ebe-769e-43cc-9023-c77414ebc986';

const rows = (page) => page.locator('[role=group][aria-label]');
const primaryOf = (page, name) => page.getByRole('group', { name }).locator('label.cds--checkbox-label');
const rowState = (page) =>
  page.$$eval('[role=group][aria-label]', (gs) =>
    gs.map((g) => `${g.getAttribute('aria-label')}:${g.querySelector('input[type=checkbox]').checked}`),
  );

recordScenario({
  baseUrl: BASE,
  login: { username: 'admin', password: 'Admin123', location: 'Outpatient Clinic' },
  startPath: `/openmrs/spa/patient/${PATIENT}/chart/Patient%20Summary`,
  out: process.argv[2] ?? 'repro.mp4',

  // Not recorded: open the workspace and reach the starting state
  setup: async (page) => {
    await page.getByRole('button', { name: 'Visit note' }).first().click();
    const search = page.getByPlaceholder('Search for a diagnosis');
    for (const [query, name] of [['malaria', 'Malaria'], ['hypertension', 'Hypertension']]) {
      await search.fill(query);
      await page.getByRole('button', { name, exact: true }).click();
      await page.getByRole('group', { name }).waitFor();
      if (name === 'Malaria') await primaryOf(page, 'Malaria').click();
    }
  },

  // Workspace panel from its header down to the Note field
  crop: (page) =>
    page.evaluate(() => {
      const form = document.querySelector('form.cds--form').getBoundingClientRect();
      const header = [...document.querySelectorAll('*')].find(
        (el) => el.children.length === 0 && el.textContent.trim() === 'Add visit note' && el.getBoundingClientRect().x >= form.x - 2,
      );
      const top = header ? header.getBoundingClientRect().top - 14 : form.top;
      const note = document.getElementById('additionalNote').getBoundingClientRect();
      return { x: form.x - 1, y: top, width: form.width + 2, height: note.bottom + 20 - top };
    }),

  scene: async (page, h) => {
    await h.caption('Goal: make Hypertension the primary diagnosis instead of Malaria');
    await h.sleep(2200);

    await h.caption('1. Tick Primary on Hypertension (row 2)');
    await h.click(primaryOf(page, 'Hypertension'));
    await h.sleep(1600);

    await h.caption('2. Untick Primary on Malaria, which was in row 1');
    await h.click(rows(page).first().locator('label.cds--checkbox-label'));
    await h.sleep(1400);

    // Caption the outcome from observed state, never from what the bug is expected to do
    const final = await rowState(page);
    console.log('final state', final);
    await h.caption(
      final.join() === 'Malaria:true,Hypertension:false'
        ? 'Result: Hypertension had moved into row 1, so it got unticked. Malaria is still primary.'
        : `Result: ${final.join(', ')}`,
    );
    await h.sleep(3200);
  },
}).then((r) => console.log(r));
