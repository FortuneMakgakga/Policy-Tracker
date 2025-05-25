document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('claim-search-form');
  const result = document.getElementById('claim-result');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const claimId = document.getElementById('claim-id').value;

    result.innerHTML = 'Searching...';
    try {
      const response = await fetch(`/api/claims/${claimId}`);
      const data = await response.json();
      if (response.ok) {
        result.innerHTML = `
          <h3>Status: ${data.status}</h3>
          <p><strong>Claim Type:</strong> ${data.claim_type}</p>
          <p><strong>Date:</strong> ${data.incident_date}</p>
          <p><strong>Amount:</strong> ${data.claim_amount}</p>
          <p><strong>Description:</strong> ${data.description}</p>
        `;
      } else {
        result.innerHTML = `<p style="color:red;">${data.error}</p>`;
      }
    } catch (err) {
      result.innerHTML = '<p style="color:red;">Error fetching claim data.</p>';
    }
  });
});
