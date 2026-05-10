import mapboxgl from "mapbox-gl";

let configured = false;

export const configureMapboxForRendering = () => {
  if (configured) return;
  configured = true;

  mapboxgl.workerCount = 1;
  mapboxgl.maxParallelImageRequests = 8;
};
