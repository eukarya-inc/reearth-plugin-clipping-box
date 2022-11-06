const SIDE_PLANES = [
    {
        normal: {
            x: 0,
            y: 0,
            z: 1,
        },
        distance: 0.5
    },
    {
        normal: {
            x: 0,
            y: 0,
            z: -1,
        },
        distance: 0.5
    },
    {
        normal: {
            x: 0,
            y: 1,
            z: 0,
        },
        distance: 0.5
    },
    {
        normal: {
            x: 0,
            y: -1,
            z: 0,
        },
        distance: 0.5
    },
    {
        normal: {
            x: 1,
            y: 0,
            z: 0,
        },
        distance: 0.5
    },
    {
        normal: {
            x: -1,
            y: 0,
            z: 0,
        },
        distance: 0.5
    },
];

const userInput = reearth.widget?.property || {};
const location = userInput.location || {};
const dimensions = userInput.dimensions || {};
const clipping = userInput.clipping || {};
const box = userInput.box || {};
const tileset = userInput.tileset?.url;

const boxId = reearth.layers.add({
  extensionId: "box",
  pluginId: "reearth",
  isVisible: true,
  property: {
    default: {
      location: {
          lng: location.lng,
          lat: location.lat,
          height: location.height,
      },
      ...dimensions,
      outlineColor: box.outlineColor,
      outlineWidth: box.outlineWidth,
      fill: !!box.fillColor,
      fillColor: box.fillColor,
      outline: !!box.outlineColor,
    },
  },
});
const tilesetId = reearth.layers.add({
  extensionId: "tileset",
  pluginId: "reearth",
  isVisible: true,
  property: {
    default: {
      experimental_clipping: {
        location: {
            lng: location.lng,
            lat: location.lat,
            height: location.height,
        },
        ...dimensions,
        planes: SIDE_PLANES,
      },
      edgeColor: clipping.edgeColor,
      edgeWidth: clipping.edgeWidth,
      tileset,
    },
  },
});

const lookAt = (position) => {
    reearth.camera.lookAt(position, { animation: false });
}

let isBoxClicked = false;
let isTopBottomSidePlaneClicked = false;
let currentCameraPosition = null;
let currentLocation = location || {};
let prevY = null;
reearth.on("mousedown", (e) => {
     if(e.layerId?.startsWith(boxId)) {
        isBoxClicked = true;
        isTopBottomSidePlaneClicked = e.layerId.endsWith("top") || e.layerId.endsWith("bottom");
     }
    if(isBoxClicked) {
        const cameraPosition = reearth.camera.position;
        currentCameraPosition = { ...cameraPosition };
        lookAt(currentCameraPosition);
    }
});
reearth.on("mouseup", () => {
    if(isBoxClicked) {
        // TODO: Fix to use `animation: false`.
        // This is workaround because if we use `lookAt` with `animation: false`, zooming interaction is freeze.
        reearth.camera.lookAt(currentCameraPosition, { duration: 0 });
        currentCameraPosition = null;
        isBoxClicked = false;
        isTopBottomSidePlaneClicked = false;
        prevY = null;
    }
});
reearth.on("mousemove", (e) => {
    if(!isBoxClicked) return;
    if(!prevY) {
        prevY = e.y;
    }

    if(isTopBottomSidePlaneClicked) {
        const scale = reearth.camera.position.height / currentLocation.height;
        currentLocation.height = Math.max(currentLocation.height + (prevY - e.y) * scale, 1);
        prevY = e.y;
    } else {
        currentLocation.lat = e.lat;
        currentLocation.lng = e.lng;
    }

    lookAt(currentCameraPosition);

    reearth.layers.overrideProperty(boxId, {
        default: {
            ...dimensions,
            location: {
                lng: currentLocation.lng,
                lat: currentLocation.lat,
                height: currentLocation.height,
            },
        },
    });

    new Promise((resolve) => {
        reearth.layers.overrideProperty(tilesetId, {
            default: {
                experimental_clipping: {
                    planes: SIDE_PLANES,
                    ...dimensions,
                    location: {
                        lng: currentLocation.lng,
                        lat: currentLocation.lat,
                        height: currentLocation.height,
                    },
                },
            }
        });
        resolve();
    });
});
