# Synthetic Health Metrics Cohort Summary

This corpus is fully synthetic and intended for demo purposes only. It represents a 100-client remote health monitoring and care navigation population designed to show off retrieval across quantitative metrics, executive summaries, and unstructured care-team notes.

## Cohort Snapshot

- Total clients: 100
- Regions: 25 Northeast, 25 Midwest, 25 South, 25 West
- Risk mix: 23 high risk, 39 rising risk, 38 stable
- Elevated blood pressure cluster: 32 clients flagged `bp_above_goal`
- Elevated glucose cluster: 30 clients flagged `a1c_above_goal`
- Medication adherence concern: 35 clients flagged `low_med_adherence`
- Recent utilization concern: 16 clients flagged `recent_ed_utilization`

## What This Dataset Is Good At

This corpus is intentionally strong for questions like:

- Which high-risk clients have worsening blood pressure and poor adherence?
- Which clients show elevated A1C plus recent emergency department utilization?
- What themes appear in care-manager notes for missed follow-up appointments?
- Which clients are improving across blood pressure, glucose control, and activity?
- Which interventions seem most appropriate for transportation barriers, pharmacist review, or remote patient monitoring escalation?

## High-Risk Profiles To Watch

### Blood pressure and engagement risk

- `CL-040` is a West-region high-risk client with `148/78` average blood pressure, `73%` medication adherence, one missed appointment, worsening blood pressure trend, worsening activity trend, and a note to continue RPM outreach and medication reconciliation.
- `CL-080` is another West high-risk client with `143/84` average blood pressure, `78%` adherence, one missed appointment, and the same RPM-focused next step.
- `CL-006` is a Midwest high-risk client with `142/90` blood pressure and worsening blood pressure despite strong adherence, making this one useful for questions about risk that is not caused by adherence alone.

### Glucose control and utilization risk

- `CL-017` combines `A1C 8.5`, low adherence, and two ED visits. This makes it a strong example of glucose risk plus recent utilization.
- `CL-018` combines `A1C 8.7`, low adherence, and one ED visit, with a dietitian and blood-pressure-technique follow-up recommendation.
- `CL-099` is a rising-risk South client with `A1C 8.8`, two missed appointments, one ED visit, and otherwise strong engagement markers in activity and adherence.

### Hidden risk despite modest vitals

- `CL-020` has one of the highest risk scores in the corpus even though glucose and blood pressure are relatively controlled. This helps demonstrate that risk scoring can combine history, CHF diagnosis, and follow-up reliability rather than only current biometrics.
- `CL-087` is high risk with chronic kidney disease and diabetes, lower adherence, and a PCP follow-up recommendation, even though current glucose and blood pressure are not extreme.

## Improving Clients

The strongest “improving” cohort is useful for contrast and success-story retrieval:

- `CL-060`
- `CL-067`
- `CL-082`
- `CL-083`
- `CL-084`
- `CL-100`

Common traits in that improving set include:

- improving blood pressure trend
- improving glucose trend
- moderate to high engagement
- better daily step counts
- cleaner flag profiles than the rest of the cohort

## Operational Insights

### Theme 1: transportation and follow-up reliability

Missed follow-up is a recurring pattern for clients such as `CL-025`, `CL-033`, `CL-040`, `CL-065`, `CL-085`, and `CL-099`. This is useful because the plain-text notes expand on whether the barrier is transportation, scheduling friction, or competing caregiver duties.

### Theme 2: low adherence is not always the whole story

Low adherence shows up often, but not every high-risk client is non-adherent. `CL-006` is a good example of persistent blood-pressure risk despite high adherence. This creates better retrieval behavior because a good answer should separate physiological instability from engagement problems.

### Theme 3: sleep and behavioral health matter

Clients such as `CL-013`, `CL-040`, `CL-051`, `CL-064`, `CL-076`, and `CL-089` show sleep or behavioral-health-related patterns. These are distributed across both stable and high-risk groups, making them useful for nuanced comparison questions.

## Suggested Demo Questions

- Which high-risk clients in the West have worsening blood pressure and low medication adherence?
- Which clients have elevated A1C and recent ED utilization?
- What barriers are showing up in the care notes for clients with missed follow-up?
- Which clients look like intervention success stories, and what do they have in common?

