
Unfiltered Notes

Clarifying Questions: 
1. What do you wish weather.com could do for your use-case?  - save time window and viewable within one page and not have to jump around or scroll
2. What do you not like about weather.com? - Too much information, Cannot track specific time windows, hourly forecast is not within one screen
3. Can you demo at night? - No 
4. Should the dashboard track a scheduled window - This is a nice to have feature, to cut down on the noise and hit the 10sec decision
5. What is the typical length of a demo? - 6 hours to add margin for error 
6. Any level of rain is a no go? - Yes. Rain is always a no-go.
7. Are there any other secondary weather factors we need to consider? - Not right now. These are the main factors.
8. Do you like having contextual knowledge of other weather factors? Like temp? - For the 10 sec no-go decision, no. I want a simple quick dashboard. Later maybe temp for audience comfort, but out of scope right now.
9. When there is a block of time within bounds, but the rest of the day is outside of the bounds, how should I handle it? - Tara only cares if there is a valid time window, then she can dive into the details of which contigious hours are valid
10. What is the visibility threshold? - 10 miles is ideal and less than 3

Key Insights: 
1. We should exclude night forecast. Only daylight hours with 6 hours being the demo time window interval
2. If a day has a valid window of time, then it is a candidate, even if outside of the window is out of bounds 
3. One-page
4. Optimize for 10 sec decision - cut out the noise 

Go / Iffy / No-go Thresholds (full detail + unit notes in API-Endpoints.md §3):
| Factor | Variable (unit) | Good | Iffy | No-go |
| --- | --- | --- | --- | --- |
| Wind | wind_speed_10m (kn) | < 15 | 15–20 | > 20 |
| Wave | wave_height (ft) | < 2 | 2–4 | > 4 |
| Precipitation | precipitation (mm) | 0 (none) | — | any rain |
| Visibility | visibility (m) | ≥ 10 mi (~16,093 m) | 3–10 mi (~4,828–16,093 m) | < 3 mi (< ~4,828 m) |

Base Logic Rule: worst factor wins. Hour status = worst of its 4 factors → window
status = worst hour in the contiguous daylight window → day badge = best available
window. Rain or <3 mi visibility in a window kills that window outright.

Requirements: 
1. View entire 10 day forecast in one page 
2. Visually categorize days and hours 
---
3. Responsive mobile design
4. Save a time window - more effort but higher ROI since it contributes saving time for the 10 sec no-go decision 
5. Multiple cities

Nonfunctional Requirements: 
1. Should be able to make a decision in 10 seconds - Answer the question does this day have 6 hour time window that is within bounds 
2. Page should load in < 1 sec 
3. Data should be cached for 10 min for quick subsequent page load times

Out of scope: 
1. Multiple cities, but I would just add a city drop down in one of the top corners of the dashboard
2. Changing weather alerts - If a forecast changes dramatically, a scheduling window's status changes, etc
3. Varying Weather Maxes? Adding Weather Factors? 
4. Boat Captain approval status
5. Suggested time windows - explicitly stated to be out of scope "I dont need it to make the decision for me"
6. Choosing the best window - recommendation system would be time consuming and have edge cases. Within this timeframe allowing human judgement is safest option 

Tech Stack: 
1. React - Specified in requirements 
2. MUI - AI trained, highly accessible, all usages covered, covers mobile responsiveness
3. RTK Query - Reduce fetching between pages with ttl cache
4. Redux - Global state management for React

Rough Plan: 
1. Prototype design
2. Get agent docs established - api context, root agent file - 
3. Establish api contracts and endpoints -
4. Establish the layout 
5. Implement 10 day overview
6. Implement save time window
7. Implement flexible thresholds 
8. Implement local storage 
9. Deploy to vercel

What I did:
0. Read doc and take notes on clarifying questions, requirements, nonfunctional requirements, out of scope, tech stack, rough plan
1. Generate my own ideas
    a. Need visual indication of status 
    b. Status states are going to be useful
    c. One page dashboard
    d. Settings page for extensibility for use-cases and users
2. Gather inspiration from experiences and notable weather applications
   a. ForeFlight - I used this application to get weather forecasts to schedule my flight lessons based on multiple factors for no-go decisions
   b. Weather.com - I need to see what Tara is working with right now.
3. Throw requirements into AI without any guidance to see what it comes up with and if it considers things that I did not
    a. Showed a lot of iterations of how to visualize the days 

During Implementation Log: 
1. Decided against using nodejs as it is overkill for this project because no api key and auth

Final Questions: 
1. Walk us through your decisions. What did you prioritize and why? What did you leave out? If Tara were sitting next to you, what
   would you ask her before building the next version?

2. How would you evolve this tool? Tara wants to add the other demo sites (Panama City, Norfolk, San Diego). The boat captains
   want a mobile version. PM's want to pull in historical weather patterns so Tara can push back on leadership scheduling demos during
   storm season. How do you prioritize? What would you build next?
