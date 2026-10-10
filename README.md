# CHHAON — छाँव

**धूप में सुरक्षा, हर कदम पर छाँव।**

CHHAON is a location-based environmental heat-risk screening and work-planning application designed to help outdoor workers and supervisors understand weather conditions, compare forecast work windows, and review practical heat-safety actions.

## Features

- Location search and interactive worksite map
- Current weather and hourly forecast information
- UV Index and other environmental indicators when available
- Work-context inputs for workload, exposure duration, shade, water access, and heat acclimatization
- Context-aware heat-risk screening and safety recommendations
- Forecast-window comparison and printable safety report
- Methodology, sources, and limitations disclosures

## Technology

- React, TypeScript, and Vite
- Open-Meteo weather API
- OpenStreetMap data and Nominatim geocoding
- Leaflet-based interactive map
- AWS SAM CLI generated starter project in `chhaon-api/` (not yet integrated with the frontend)

## Run locally

Requirements: Node.js and npm.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite in your terminal.

To run the test suite and production build, use the scripts defined in `package.json`, typically:

```bash
npm test
npm run build
```

## Data and limitations

CHHAON uses provider-supplied weather data and geocoded locations. Weather values are model-based estimates and may differ from conditions at the exact worksite. Location search results depend on available map data; a manually selected map point is not a verified address.

The application is an environmental screening and work-planning aid. It is not a medical diagnosis, a certified occupational heat-stress assessment, or a substitute for on-site measurements such as Wet Bulb Globe Temperature (WBGT). Forecast comparisons do not guarantee that any time is safe for work. Follow local safety procedures and emergency guidance.

## AWS status

The `chhaon-api/` directory was generated as an AWS SAM starter project. It is not currently connected to the frontend and should not be considered a deployed or operational CHHAON backend.

## Responsible use

Use the information as one input to worksite planning. Supervisors should account for actual site conditions, worker symptoms, access to shade and water, and applicable occupational safety requirements.

## AI tools disclosure

Antigravity and ChatGPT were used as AI-assisted development tools during this project. The author reviewed and tested the implementation.

## Acknowledgements

- [Open-Meteo](https://open-meteo.com/)
- [OpenStreetMap](https://www.openstreetmap.org/)
- [Nominatim usage policy](https://operations.osmfoundation.org/policies/nominatim/)
- [AWS Serverless Application Model](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/what-is-sam.html)
