# Final Questions

## 1. Walk us through your decisions. What did you prioritize and why? What did you leave out? If Tara were sitting next to you, what would you ask her before building the next version?

I started with simulating clarifying questions and answers with Tara:

- **What do you wish weather.com could do for your use case?** Display a saved time window on a single page, without having to scroll or jump between screens.
- **What don't you like about weather.com?** Too much information, no way to track specific time windows, and the hourly forecast doesn't fit on one screen.
- **Can you demo at night?** No.
- **Should the dashboard track a scheduled window?** Nice-to-have. It would cut down on noise and support a quick, 10-second go/no-go decision.
- **What is the typical length of a demo?** 6 hours, which adds margin for error.
- **Is any level of rain a no-go?** Yes. Rain is always a no-go.
- **Are there other secondary weather factors to consider?** Not right now. These are the main factors.
- **Is contextual knowledge of other factors (e.g., temperature) helpful?** Not for the 10-second go/no-go decision — the goal is a simple, quick dashboard. Temperature may be useful later for audience comfort, but it's out of scope for now.
- **When part of the day is within bounds but the rest is outside, how should that be handled?** Tara only needs to know whether a valid time window exists. From there, she can dig into which contiguous hours are valid.
- **What is the visibility threshold?** 6 miles or more = go; 3–6 miles = caution; less than 3 miles = no-go.
- **Do you want to use this dashboard across devices?** Not right now — only on the work laptop.

### North Star

I distilled these answers into a north star to judge my decisions against:

> **We are optimizing for the 10-second no-go decision.**

### Key Insights

I gathered key insights based on the answers and new north star:

- We need to cut down on the noise of weather.com
- We need to reduce the amount of clicks to do anything
- The application should be one-page
- We need a visual overview of the 10-day forecast

### Requirements and Out of Scope

**Requirements:**

- View 10-day forecast in one page
- Visually categorize days and hours
- Monitoring a chosen window of time
- Load times should be < 1 sec

**Out of scope (prioritized):**

- Responsive mobile design
- Adjustable weather thresholds
- Multiple cities
- Captain approval status
- Demo types — saved configuration of settings

### Setup

I decided on a tech stack that was appropriate for the complexity.

I set guardrails and context for development:

- root `CLAUDE.md`
- CI/CD pipeline with 90% test coverage

I started implementing from the data upwards with a core principle of keeping the frontend dumb. This meant transforming and normalizing the data at the lowest level.

### Key Implementation Decisions

**Include (Prioritized):**

**No-Go Core Logic**

- Any amount of rain is a no-go, because Tara explicitly called it out for demo optics.
- Visibility thresholds are Go: ≥6, Caution: 3–<6, No-go: <3 mi.
    - I took inspiration from marginal VFR weather minimums from my pilot training and used my best judgement.
- We need a contiguous set of hours that do not exceed the no-go thresholds on ANY weather factor.
- If we cannot fetch a factor, then that hour is a no-go because we do not want to infer anything, as the demo is a high-profile event.

**How do I optimize for the 10-second decision and how do I use visuals?**

- **Horizontal visual forecast** — This is the core feature to quickly determine a day's ability to be a candidate.
- **Availability window and demo length filtering** — I added these features because they cut out the noise even further, leading to quicker decisions. For example:
    - Tara knows the Navy is only available 12pm–6pm for a 2-hour demo.
    - Tara filters the availability window to 12pm–6pm and 2 hours.
    - I prioritized these as configurable over the weather thresholds because:
        - Scheduling with large groups of people is mentioned.
        - Demo lengths are more likely to vary than the weather thresholds.
    - When changing the availability window or demo length, I highlight day candidates. This eliminates the user from having to reinterpret the data for the changing settings.
- **Prefiltering data to daylight hours** — If visibility is a concern, then night-time demos seem irrelevant. This is an improvement of cutting down noise from weather.com.
- **Pinning a demo window** — Rather than Tara having to re-interpret the data every morning after scheduling a demo, she now can only check the window she cares about, further cutting down on the decision time. Additionally, the feature allows Tara to compare multiple windows. This feature was nice to have, but had a high impact.
- **CAUTION Status** — Tara should be able to distinguish an hour that is clearly within her thresholds versus one that is nearing the thresholds, because that impacts demo quality. The caution status is dynamically calculated, to account for future extensibility for configurable weather thresholds.

**Exclude:**

- **Typical backend infrastructure**
    - In the clarifying questions, Tara mentions she will only use this on her work computer. Therefore, I used localStorage to store the pinned windows as a nice middle ground.
    - There are no security concerns. This is a public API with no company data.
- **Configurable weather thresholds and other factors** — I excluded these features because I am assuming Tara has extensive experience scheduling demos and knows exactly what she needs.
- **Saved settings** — This is outside of the core requirements, but would have been nice to have.
- **UI enforcing rules** — For example, not letting the user pin a window outside of the availability window. I intentionally did not enforce rules like these, to give the user the most flexibility.

### Questions I Would Ask Tara

- I would watch her use it, then take notes without my guidance.
- I would vaguely ask what she does and does not like about it (to judge first impressions and not introduce bias).
- Do we need the ability to change weather thresholds for separate demo types?
- Since you use the application every day, is the key necessary?
- Do we care about sky conditions for optics? Or any other weather factors?
- Do different demo types have different weather thresholds?
- Do you want to add the captain approval step integrated into the dashboard?
- Are there any integrations you want in the application?
- Is there a need for this to scale to many users?
- Would you like alerts about scheduled demos?

---

## 2. How would you evolve this tool? Tara wants to add the other demo sites (Panama City, Norfolk, San Diego). The boat captains want a mobile version. PMs want to pull in historical weather patterns so Tara can push back on leadership scheduling demos during storm season. How do you prioritize? What would you build next?

I prioritize work based on the amount of effort it will take, when it is needed by, and whether it aligns with the north star of the application.

- In this context, the north star might change based on Tara's answers. So currently, I am prioritizing against the current north star: the 10-second decision.

I would prioritize the mentioned features in this order:

1. **Multiple cities**
    - This is a low effort to implement.
    - I would add a dropdown in one of the corners that configures the dashboard to that location.
2. **Historical data**
    - This requires backend infra, but would be fundamental to other features.
    - This is fundamental to improving the quality of the system, like adding recommended windows based on past data, introducing our own weather system to infer missing data, and alerts.
3. **Mobile version**
    - If a mobile version is referring to a mobile native application, then I would deprioritize it, because my web application is already mobile compatible and a native application offers little to the core functionality.

I would evolve this application with the following features:

- **Implement a backend** and persist the following information:
    - Settings
    - Pinned Windows
    - Accounts
- **Implement alerts** — This translates the 10-second decision into a proactive application. Once the demo is scheduled, the user might not have to enter the dashboard!
- **Implement captain status** into the dashboard, allowing the captain to async approve a demo. This reduces communication time between the captain and Tara.