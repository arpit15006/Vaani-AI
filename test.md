# VaaniAI Advanced QA: Max Potential Test Protocol

This document outlines the exact boundary conditions, edge cases, and high-level tests required to stretch the newly implemented autonomous / proactive architecture of VaaniAI to its absolute limits. Follow these tests sequentially to verify the "Jarvis/Vaani Transformation."

---

## TEST 1: The Autonomous ReAct Loop (Phase 1)
**Goal:** Prove the backend `Observer` agent functions correctly to execute multi-chain actions without you stepping in.

1. Open your microphone and say:
   > *"Check if I have any meetings today. If I do, tell me what they are, and then schedule a 30-minute 'Focus Time' padding block immediately after the last one."*
2. **Expected Behavior:** 
   - Vaani receives a complex intent.
   - She triggers the `calendar_list` tool.
   - The *Observer* analyzes the output, recognizes the task is unfinished, and loops her back without asking you.
   - She triggers the `calendar_create` tool.
   - The *Observer* finally determines the task is complete, and generates a conversational summary detailing the meetings she found and the block she created.

---

## TEST 2: The Safety Vault & Edit-Before-Send (Phase 3 & 6)
**Goal:** Test the "Dry-Run" execution layer ensuring destructive tasks are memory-boxed and editable before firing.

1. Say:
   > *"Send an email to arpit@example.com telling him the project is deployed."*
2. **Expected Behavior:**
   - Vaani stops. She does **not** send the email.
   - She replies: *"I've prepared the email to arpit... Should I send it?"*
3. **The Edit Curveball:** Say:
   > *"Wait, change the subject to 'URGENT DEPLOYMENT' and ask him to call me."*
4. **Expected Behavior:**
   - The Intent Classifier routes this as an `edit_draft`.
   - The Planner pulls the unsent JSON from the memory vault, modifies the specific fields using the LLM, and responds: *"Got it, I've updated the draft. Send it now?"*
5. Say: *"Yes."*
   - Vaani executes the stored payload perfectly.

---

## TEST 3: The Hallucination Guard (Phase 3)
**Goal:** Verify the system doesn't try to guess or lie when confronted with an impossible backend task.

1. Say:
   > *"Draft a tweet about my new AI project and then post it directly to my Twitter account."*
2. **Expected Behavior:**
   - There is no `twitter_post` tool mapped. Older chatbots would hallucinate a fake success message ("I posted your tweet!").
   - Vaani's safeguard should intercept the router failure and respond elegantly: 
     *"I couldn't complete that action due to a missing tool or system limitation. However, here is the draft you asked for..."*

---

## TEST 4: The Silent Proactive Heartbeat (Phase 4)
**Goal:** Test the background cron watcher, SSE pipeline, and Notification Toast/TTS generation limits.

1. **Setup:** Open your raw Google Calendar. Create a fake event called "Emergency Server Reboot Review" starting **exactly 18 minutes from right now**. Set the Location to "London, UK".
2. Open the Vaani Dashboard. Do absolutely nothing. Do not speak.
3. Observe the top-right header layout—you should see a blue pulsing **"Active"** indicator next to the radio icon, proving the SSE connection is alive.
4. Wait between 2 to 5 minutes.
5. **Expected Behavior:**
   - A `proactive_alert` is pushed via SSE.
   - A blue "Vaani Alert" Toast appears on the screen.
   - Your speakers activate automatically.
   - Because you set the location to London, Vaani should actively state the London Weather dynamically in her unprompted sentence (e.g. *"Pardon the interruption, but you have the 'Emergency Server Reboot Review' in 15 minutes. It's currently X degrees and rainy in London..."*).

---

## TEST 5: The OAuth Refresh Edge Case (Critical Security)
**Goal:** Prove Vaani does not crash if `EventSource` mounts while the backend access token is organically expired.

1. Log into Supabase (if you have local access to the db).
2. Go to the `auth_tokens` table for your user ID.
3. Manually edit the `access_token` string to make it intentionally invalid (e.g., change the last 3 characters). Leave `refresh_token` intact.
4. Hard refresh the Vaani Dashboard.
5. **Expected Behavior:**
   - The UI mounts perfectly because SSE passes the `email` identifier.
   - Within 5 minutes, the Proactive Watcher tries to hit Google APIs and receives a `401 Unauthorized`.
   - The `tokenService.js` intercepts the failure, uses the valid `refresh_token` to securely fetch a brand-new access token from Google OAuth.
   - Vaani updates the database silently and continues parsing your calendar flawlessly without throwing errors to the frontend.

---

### Final Check: The Mute Override
1. Open the **Settings Panel**.
2. Turn **Disable** on the `Proactive Agent` toggle.
3. Schedule another meeting for 10 minutes from now.
4. Wait.
5. **Expected Behavior:** Vaani will completely ignore the meeting and stay utterly silent, proving the user-preference override works.
