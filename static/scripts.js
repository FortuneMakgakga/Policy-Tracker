document.addEventListener("DOMContentLoaded", () => {
    const claimForm = document.getElementById("claim-form");
    const trackForm = document.getElementById("track-form");

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
                email: document.getElementById("email").value
            };

            try {
                const response = await fetch("/api/claims", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(formData)
                });
                const data = await response.json();
                document.getElementById("claim_result").innerText = response.ok ? `✅ Claim submitted! ID: ${data.claim_id}` : `❌ Error: ${data.error}`;
            } catch (error) {
                document.getElementById("claim_result").innerText = "❌ Submission failed. Try again.";
            }
        });
    }

    if (trackForm) {
        trackForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            const claimId = document.getElementById("claim_id").value.trim();

            if (!claimId) {
                document.getElementById("status_result").innerHTML = "<span style='color: red;'>❌ Please enter a Claim ID.</span>";
                return;
            }

            try {
                const response = await fetch(`/api/claims/${claimId}`);
                const data = await response.json();

                if (response.ok) {
                    document.getElementById("status_result").innerHTML = `
                        <h3 style="color: lightgreen;">✅ Claim Found!</h3>
                        <p><strong>Claim ID:</strong> ${data.claim_id}</p>
                        <p><strong>Status:</strong> ${data.status}</p>
                        <p><strong>Type:</strong> ${data.claim_type}</p>
                        <p><strong>Date:</strong> ${data.incident_date}</p>
                        <p><strong>Location:</strong> ${data.incident_location}</p>
                        <p><strong>Description:</strong> ${data.description}</p>
                        <p><strong>Amount:</strong> $${parseFloat(data.claim_amount).toFixed(2)}</p>
                        <p><strong>Claimant:</strong> ${data.claimant_name}</p>
                    `;
                } else {
                    document.getElementById("status_result").innerHTML = `<span style='color: red;'>❌ ${data.error}</span>`;
                }
            } catch (error) {
                document.getElementById("status_result").innerHTML = "<span style='color: red;'>❌ Failed to retrieve status. Try again.</span>";
            }
        });
    }
});
