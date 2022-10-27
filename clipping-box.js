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
const position = userInput.position;
const dimensions = userInput.dimensions;
const clipping = userInput.clipping || {};
const box = userInput.box || {};
const tileset = userInput.tileset?.url;

const boxId = reearth.layers.add({
  extensionId: "box",
  pluginId: "reearth",
  isVisible: true,
  property: {
    default: {
      dimensions,
      position,
      height: position?.height,
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
      clippingPlaneCollection: {
        dimensions,
        planes: SIDE_PLANES,
        lat: position?.lat,
        lng: position?.lng,
        height: position?.height,
      },
      edgeColor: clipping.edgeColor,
      edgeWidth: clipping.edgeWidth,
      tileset,
    },
  },
});

const lookAt = (position) => {
    reearth.camera.lookAt(position);
}

let isBoxClicked = false;
let isTopBottomSidePlaneClicked = false;
let currentCameraPosition = null;
let currentPosition = position || {};
reearth.on("mousedown", (e) => {
     if(e.layerId?.startsWith(boxId)) {
        isBoxClicked = true;
        isTopBottomSidePlaneClicked = e.layerId.endsWith("top") || e.layerId.endsWith("bottom");
     }
    if(isBoxClicked) {
        lookAt(currentCameraPosition);
    }
});
reearth.on("mouseup", () => {
    if(isBoxClicked) {
        lookAt(currentCameraPosition);
        currentCameraPosition = null;
        isBoxClicked = false;
        isTopBottomSidePlaneClicked = false;
    }
});
let prevY = null;
let prevPosition = null;
reearth.on("mousemove", (e) => {
    if(!isBoxClicked) return;

    if(!prevPosition) {
        prevPosition = {
            lat: e.lat,
            lng: e.lng,
        };
    }
    if(!prevY) {
        prevY = e.y;
    }

    if(isTopBottomSidePlaneClicked) {
        const scale = reearth.camera.position.height / currentPosition.height;
        currentPosition.height = Math.max(currentPosition.height + (prevY - e.y) * scale, 1);
        prevY = e.y;
    } else {
        currentPosition.lat += e.lat - prevPosition.lat;
        currentPosition.lng += e.lng - prevPosition.lng;
        prevPosition = {
            lat: e.lat,
            lng: e.lng,
        };
    }

    lookAt(currentCameraPosition);

    reearth.layers.overrideProperty(boxId, {
        default: {
            dimensions,
        position: {
                lng: currentPosition.lng,
                lat: currentPosition.lat,
            },
            height: currentPosition.height,
        },
    });

    new Promise((resolve) => {
        reearth.layers.overrideProperty(tilesetId, {
            default: {
                clippingPlaneCollection: {
                    planes: SIDE_PLANES,
                    dimensions,
                    lng: currentPosition.lng,
                    lat: currentPosition.lat,
                    height: currentPosition.height,
                },
            }
        });
        resolve();
    });
});
