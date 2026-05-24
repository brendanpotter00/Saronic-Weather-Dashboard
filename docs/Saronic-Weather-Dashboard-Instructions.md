# Saronic Technologies: Program Systems Take-Home Challenge

**Time estimate:** 2–3 hours (please don't spend more than 4)
**Stack:** React + TypeScript (any tooling you prefer)
**Deliverables:** Working application + written responses

## Overview

You've just joined the team at Saronic. On your first Monday, you get a Slack message from Tara Okonkwo, the Demo Scheduling Coordinator.

## The Scenario

> Hi! Here's my problem:
>
> We build autonomous surface vessels and we run customer demos at our test sites. Our primary site is Gulfport, MS — we also demo out of Panama City, Norfolk, and San Diego, but let's just focus on Gulfport for now. These demos are a BIG deal — we're often hosting Navy program offices or DARPA evaluators, and they fly in specifically for this. Canceling or rescheduling is expensive and embarrassing.
>
> The issue is weather. We can't run demos in high winds, rough seas, heavy rain, or low visibility. Right now my process is: I google the weather a few days before, I text our boat captain for his gut feel on sea state, and I make a call. It works okay but I've gotten burned twice this quarter — once when I greenlit a demo that got rained out, and once when I canceled a demo that turned out to be a beautiful day.
>
> What I need is a 10-day look ahead at weather conditions so I can plan demos with more confidence. I don't need it to make the decision for me — I just need the information in one place instead of checking 3 different weather websites.
>
> Some things that matter:
> - **Wind speed** — over 20 knots is a no-go, 15–20 is iffy
> - **Wave height** — over 4 feet is rough, 2–4 is manageable
> - **Precipitation** — rain is bad for optics demos especially
> - **Visibility** — we need decent visibility for the customer to actually see the vessel
>
> If you could build something I could check each morning, that would be incredible. Doesn't need to be fancy.

## The Location

**Gulf Test Range — Gulfport, MS**
Latitude: 30.3674 · Longitude: -89.0928

## The API: Open-Meteo

You'll be using Open-Meteo — free, no API key, no registration.

**Weather Forecast API** — up to 16-day hourly forecast

```
https://api.open-meteo.com/v1/forecast?latitude=30.37&longitude=-89.09&hourly=wind_speed_10m,precipitation,visibility,weather_code&wind_speed_unit=kn
```

Docs: https://open-meteo.com/en/docs

**Marine Forecast API** — wave height, swell, wave period

```
https://marine-api.open-meteo.com/v1/marine?latitude=30.37&longitude=-89.09&hourly=wave_height,wind_wave_height,swell_wave_height
```

Docs: https://open-meteo.com/en/docs/marine-weather-api

Both endpoints return JSON. Wind speed can be requested in knots (`&wind_speed_unit=kn`). Browse the docs to see available variables — part of this exercise is deciding what's worth pulling.

## The Challenge

Build a **10-Day Demo Weather Look Ahead** for Gulfport that Tara could check each morning to inform her demo scheduling decisions.

**Requirements:**

- Show a 10-day forecast at the Gulfport site using the Weather Forecast and Marine Forecast APIs
- Display the conditions Tara cares about: wind speed, wave height, precipitation, and visibility
- Apply Tara's thresholds to give her a quick go/no-go read on each day
- Present the data so a non-technical ops person can glance at it and understand

**Things you might consider:**

- Tara checks this every morning. What does she need in 10 seconds vs. what she can drill into?
- Which hours of the day matter for a demo? All 24, or a specific window?
- How do you handle a day where morning is fine but afternoon is bad?
- What makes this more useful than just checking weather.com?

## Tech Notes

- React + TypeScript. Any build tool.
- Any UI library, or none.
- No API key needed.
- **Decisions matter more than polish.**

## Written Responses

Include a `RESPONSES.md` in your repo root. A few paragraphs each.

1. Walk us through your decisions. What did you prioritize and why? What did you leave out? If Tara were sitting next to you, what would you ask her before building the next version?

2. How would you evolve this tool? Tara wants to add the other demo sites (Panama City, Norfolk, San Diego). The boat captains want a mobile version. PMs want to pull in historical weather patterns so Tara can push back on leadership scheduling demos during storm season. How do you prioritize? What would you build next?

## Submission

- GitHub repo (public)
- README with setup instructions
- `RESPONSES.md` in the repo root
- Email your repo link to **amy.parsons@saronic.com** and **Grant.Sullens@saronic.com**

## What We're Evaluating

| What matters most | What matters less |
| --- | --- |
| A tool that solves Tara's problem | Calling every endpoint |
| Thoughtful go/no-go logic | Pixel-perfect design |
| What you chose to build and what you skipped | Feature completeness |
| Clean, readable, maintainable code | Clever abstractions |
