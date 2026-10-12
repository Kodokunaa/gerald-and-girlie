export function setupRsvp() {
  const form = document.querySelector('#rsvp-form');
  const button = form.querySelector('button[type="submit"]');
  const status = document.querySelector('#rsvp-status');
  let submissionId = crypto.randomUUID();
  let submitting = false;
  fetch('/api/rsvp').then(response => response.json()).then(result => {
    button.disabled = !result.configured;
    status.textContent = result.configured ? '' : 'RSVP opens soon. Please check back.';
  }).catch(() => { status.textContent = 'RSVP is temporarily unavailable. Please try again later.'; });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (submitting || button.disabled || !form.reportValidity()) return;
    submitting = true;
    button.disabled = true;
    button.textContent = 'Sending…';
    status.textContent = '';
    form.setAttribute('aria-busy', 'true');
    const data = new FormData(form);
    try {
      const response = await fetch('/api/rsvp', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: data.get('name'), attendance: data.get('attendance'), message: data.get('message'), website: data.get('website'), submissionId }),
      });
      const result = await response.json();
      if (!response.ok || result.ok !== true) throw new Error(result.error || 'Your RSVP could not be saved. Please try again.');
      status.textContent = data.get('attendance') === 'yes' ? 'Your RSVP is saved. We look forward to celebrating with you!' : 'Your RSVP is saved. Thank you for letting us know—we’ll miss you!';
      form.reset();
      submissionId = crypto.randomUUID();
    } catch (error) { status.textContent = error.message || 'Your RSVP could not be saved. Please try again.'; }
    finally {
      submitting = false; button.disabled = false; button.textContent = 'Send my RSVP ↗'; form.removeAttribute('aria-busy');
    }
  });
}
