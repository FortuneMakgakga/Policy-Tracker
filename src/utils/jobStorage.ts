// src/utils/jobStorage.ts

const JOBS_KEY = "mock_jobs";

// Fetch all jobs (initially from fixtures or localStorage)
export async function getJobs() {
  const localJobs = localStorage.getItem(JOBS_KEY);
  if (localJobs) {
    return JSON.parse(localJobs);
  }

  // fallback to fixtures if nothing is stored
  const res = await fetch("/fixtures/jobs.json");
  const jobs = await res.json();
  localStorage.setItem(JOBS_KEY, JSON.stringify(jobs));
  return jobs;
}

// Add a new job
export async function addJob(job: any) {
  const jobs = await getJobs();
  jobs.push(job);
  localStorage.setItem(JOBS_KEY, JSON.stringify(jobs));
  return job;
}
export const saveJobRequest = (job: any) => {
  const existing = JSON.parse(localStorage.getItem("client_jobs") || "[]");
  existing.push(job);
  localStorage.setItem("client_jobs", JSON.stringify(existing));
};
