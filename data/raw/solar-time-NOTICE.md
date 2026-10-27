# Apparent solar time: source and attribution

NOAA material: Data provided by NOAA Global Monitoring Laboratory, Boulder, Colorado, USA (https://gml.noaa.gov).

The equation-of-time formula and literal excerpts in solar-time-noaa-excerpts.json are from the NOAA/GML Solar Calculator, main.js (SHA-256 3832956f24724eafacf9e18173b9299b1554d6252bed0784d9c9aca6d9f54856), calculation details and GML disclaimer. They are U.S. Government material in the public domain as stated at https://gml.noaa.gov/about/disclaimer.html. The NOAA material identified here is not subject to copyright protection. No NOAA logo, map tiles, photograph or third-party textbook is bundled.

The TypeScript implementation and Chinese explanatory text are this application's adaptation, not official government material. NOAA does not endorse, certify or provide support for this application. NOAA says its original calculator is no longer actively maintained and does not guarantee its accuracy or functionality.

This application evaluates the Julian-century formula at the actual UTC instant; it does not adopt the spreadsheet's approximate Julian-day formula. Its verified input policy is civil years 1900–2100. Corrected wall coordinates may enter adjacent 1899 or 2101 dates. Apparent solar time is UTC + 4 minutes per degree of east longitude + equation of time. The actual IANA offset already includes DST; it is subtracted once only when reporting the correction from the recorded civil clock. A returned solar epoch is a dated wall-coordinate, not a second physical UTC instant.

The 60-second boundary window is a conservative product review rule, not a claimed formula error bound. Seconds are displayed for reproducibility and do not certify birth-record or observational precision. Floating wall coordinates are retained until display; display takes the preceding whole second (including pre-1970 coordinates), never rounding across a clock boundary. The astronomical calculation does not validate any divination or naming outcome.

Numerical validation: 36 hand-authored instant/location/offset fixtures are evaluated independently using NOAA's unmodified downloaded JavaScript, without importing application code. Four further EOT reference values come from pvlib Python v0.13.1 (NREL SPA, numpy mode, source SHA-256 ad7762ccca5fd9611ef9e2a9b1e37f95fe4c5b31628616b2ad3e84ea1e5f9202). Only factual numerical results and source metadata are bundled; the pvlib/NREL program is not distributed or used at runtime. Fixed delta-T=67 seconds is an oracle parameter, not a general estimate. The cross-model tolerance is 0.1 minute and is not an accuracy guarantee.

Historical UTC-offset reference excerpts are from IANA tzdb 2025b (public-domain timezone data), https://data.iana.org/time-zones/tzdb-2025b/. Runtime IANA conversion uses the platform's Intl timezone database; the named historical-offset fixtures detect incompatible results.
