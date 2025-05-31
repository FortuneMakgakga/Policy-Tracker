document.addEventListener("DOMContentLoaded", () => {
  // Claim Submission
  const claimForm = document.getElementById("claim-form");
  const claimResult = document.getElementById("claim_result");

  if (claimForm) {
    claimForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formData = {
        policy_id: document.getElementById("policy_id").value,
        claim_type: document.getElementById("claim_type").value,
        incident_date: document.getElementById("incident_date").value,
        incident_location: document.getElementById("incident_location").value,
        description: document.getElementById("description").value,
        claim_amount: document.getElementById("claim_amount").value,
        claimant_name: document.getElementById("claimant_name").value,
        contact_number: document.getElementById("contact_number").value,
        email: document.getElementById("email").value,
      };

      try {
        const response = await fetch("/submit_claim", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });

        const data = await response.json();
        claimResult.innerText = response.ok
          ? `✅ Claim submitted! Your Claim ID is: ${data.claim_id}`
          : `❌ Error: ${data.error || "Submission failed."}`;
      } catch (error) {
        claimResult.innerText = "❌ Submission failed. Try again.";
      }
    });
  }

  // Claim Tracking from register_claim.html
  const trackForm = document.getElementById("track-form");
  const trackResult = document.getElementById("status_result");

  if (trackForm) {
    trackForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const claimId = document.getElementById("claim_id").value.trim();

      if (!claimId) {
        trackResult.innerHTML = "<span style='color: red;'>❌ Please enter a Claim ID.</span>";
        return;
      }

      try {
        const response = await fetch(`/api/claims/${claimId}`);
        const data = await response.json();

        if (response.ok) {
          trackResult.innerHTML = `
            <h3 style="color: lightgreen;">✅ Claim Found!</h3>
            <p><strong>Claim ID:</strong> ${data.id}</p>
            <p><strong>Status:</strong> ${data.status}</p>
            <p><strong>Type:</strong> ${data.claim_type}</p>
            <p><strong>Date:</strong> ${data.incident_date}</p>
            <p><strong>Location:</strong> ${data.incident_location}</p>
            <p><strong>Description:</strong> ${data.description}</p>
            <p><strong>Amount:</strong> $${parseFloat(data.claim_amount).toFixed(2)}</p>
            <p><strong>Claimant:</strong> ${data.claimant_name}</p>
          `;
        } else {
          trackResult.innerHTML = `<span style='color: red;'>❌ ${data.error}</span>`;
        }
      } catch (error) {
        trackResult.innerHTML = "<span style='color: red;'>❌ Failed to retrieve status. Try again.</span>";
      }
    });
  }

  // Claim Tracking from admin.html or old template (backward compatible)
  const legacyForm = document.getElementById("claim-search-form");
  const legacyResult = document.getElementById("claim-result");

  if (legacyForm) {
    legacyForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const claimId = document.getElementById("claim-id").value;

      legacyResult.innerHTML = "Searching...";
      try {
        const response = await fetch(`/api/claims/${claimId}`);
        const data = await response.json();
        if (response.ok) {
          legacyResult.innerHTML = `
            <h3>Status: ${data.status}</h3>
            <p><strong>Claim Type:</strong> ${data.claim_type}</p>
            <p><strong>Date:</strong> ${data.incident_date}</p>
            <p><strong>Amount:</strong> ${data.claim_amount}</p>
            <p><strong>Description:</strong> ${data.description}</p>
          `;
        } else {
          legacyResult.innerHTML = `<p style="color:red;">${data.error}</p>`;
        }
      } catch (err) {
        legacyResult.innerHTML = "<p style='color:red;'>Error fetching claim data.</p>";
      }
    });
  }
});
