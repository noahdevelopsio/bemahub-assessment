# Task 6 — Infrastructure

## Incident 1 — the invisible deploy

The core clues here are: "green" pipeline, not visible in your browser, but "works for me" for a colleague. This points strongly to environment mismatch, caching, or routing rather than a broken application.

* **Step 1: Check the exact URL and Environment**
  * **Why:** The most common human error is looking at the wrong tab or environment. Ensures you and your colleague are testing the exact same environment (e.g., Staging vs. Production, or a specific feature branch preview URL).
* **Step 2: Force-refresh the browser cache (Ctrl+F5 / Cmd+Shift+R) or try Incognito mode**
  * **Why:** Fast and free to check. The browser or CDN might be serving a cached version of the frontend assets (HTML/JS). If it fixes it, the issue is purely client-side.
* **Step 3: Verify the running image tag/commit hash**
  * **Why:** The deployment tool might say "green" because the API call to deploy succeeded, but the orchestrator might still be pulling the image or rolled back silently. Check the container's metadata or an `/health` or `/version` endpoint to see if the running hash matches the new commit.

## Incident 2 — 502 after deploy

A 502 Bad Gateway means the reverse proxy (Cloudflare) cannot communicate with the application server. Because the container is "running" and the change involves a new configuration value, the app is likely crashing immediately upon handling a request or failing a startup health check.

* **Step 1: Verify the Environment Variables / Secrets in the Target Environment**
  * **Why:** Since the only change was a new feature that reads a configuration value, a missing configuration variable in production is the most likely culprit. Checking the deployment dashboard for the new variable pins down the exact missing piece before you even need to dive into logs.
* **Step 2: Check the Application Container Logs**
  * **Why:** If the config variable *is* present, the logs will reveal what else is wrong. If the app reads a config value that is improperly formatted, it will throw an unhandled exception and crash (or loop crash). This confirms if the application code itself is throwing a runtime error.
* **Step 3: Check Container Health Check Status and Port Binding**
  * **Why:** The container process might be technically "running" (e.g., crash-looping script or a process that doesn't exit on error), but failing its orchestrator health check. Alternatively, the new code might have accidentally changed the port the application listens on.

## Incident 3 — the vanishing change

**What Happened?**
Containers are inherently short-lived and stateless. When the colleague installed the tool directly inside the running container, they modified the container's read-write layer in memory/local disk. When the next deployment occurred, the orchestrator destroyed the old container and spun up a brand new one based entirely on the immutable Docker Image. Because the tool and the debug fix were never written into the image or externalized, they were completely wiped out.

**How it should have been made instead:**
* **For the Debugging Tool:** It should be added to a specific `Dockerfile.dev` or `Dockerfile.test` target.
* **For the Fix:** The actual code fix must be committed to the version control system, passed through the normal CI/CD pipeline, and built directly into the new Docker image so that it persists across all future deployments.
