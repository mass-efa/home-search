---
name: home-evaluation
description: Evaluate homes for purchase using a repeatable buyer-focused workflow. Use when assessing a specific house, listing, address, property email, disclosure packet, neighborhood, comparable sale, price, offer strategy, schools, safety, appreciation, negotiation leverage, inspection risk, title risk, or home-buying decision.
---

# Home Evaluation

## Overview

Use this skill to evaluate candidate homes in a home purchase process. Produce a practical buyer brief, save durable notes in the relevant workspace, and separate facts, inferences, risks, and next actions.

## Workflow

1. Identify the property: address, listing URL, asking price, MLS details, property type, size, lot, year built, HOA, taxes, and source date.
2. Read existing workspace context first: `10_Life_OS/Dashboard.md`, then `20_Projects/2026 House Search/` if present.
3. Gather current sources. Browse for live market, school, crime, listing, tax, and nearby sale data because these are time-sensitive.
4. Use the standard rubric in `references/evaluation-rubric.md`.
5. Save the output to `20_Projects/2026 House Search/<address>.md` unless a more specific project file already exists.
6. Update the dashboard only when a property becomes actively considered or a next action changes.

## Output Shape

Lead with the decision read:

- Overall take: promising / needs diligence / concerning / pass for now.
- Main reasons to like it.
- Main risks or unknowns.
- Negotiation posture.
- Next concrete action.

Then include concise sections for schools, safety, area value trend, property value and comps, negotiation leverage, condition/diligence, title/HOA/legal, lifestyle fit, financial fit, and open questions.

## Standards

- P0 comp-table requirement: every comparable-sales table must show the subject and each comp's price per finished square foot, calculated from the displayed price and finished area. Keep $/sf visible even when the primary valuation method is explicit feature adjustment, and label it as a cross-check rather than the sole valuation method.
- Prefer official/primary sources for school district boundaries, police/crime data, tax records, permits, listing facts, and title/disclosure documents.
- Use Redfin/Zillow/Realtor/MLS-derived data for market color, but label third-party estimates and small-sample neighborhood medians as noisy.
- Never imply legal, inspection, financing, or appraisal certainty. Name what a buyer agent, inspector, lender, title officer, or attorney should verify.
- If data is unavailable, say what is missing and how to get it.
- Preserve dates on market data, listing status, price changes, and source freshness.
