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

const boxProperties = {
    location: {
        lng: location.lng,
        lat: location.lat,
        height: location.height,
    },
    ...dimensions,
    ...box,
}

const boxId = reearth.layers.add({
  extensionId: "box",
  pluginId: "reearth",
  isVisible: true,
  property: {
    default: {
      ...boxProperties,
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
        ...boxProperties,
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

const allowEnterGround = () => !!reearth.scene.property.default.allowEnterGround;

let isBoxClicked = false;
let isTopBottomSidePlaneClicked = false;
let currentCameraPosition = null;
let prevY = null;

const boxState = {
    activeBox: false,
    activeScalePointIndex: undefined, // 0 ~ 11
    isScalePointClicked: false,
    activeEdgeIndex: undefined, // 0 ~ 4
    isEdgeClicked: false,
    cursor: "default" // grab | grabbing | default
};

const updateBox = (shouldUpdateClipping) => {
    reearth.layers.overrideProperty(boxId, {
        default: {
            ...boxProperties,
            location: { ...boxProperties.location },
            cursor: boxState.cursor,
            activeBox: boxState.activeBox,
            activeScalePointIndex: boxState.activeScalePointIndex,
            activeEdgeIndex: boxState.activeEdgeIndex,
        },
    });

    if(shouldUpdateClipping) {
        new Promise((resolve) => {
            reearth.layers.overrideProperty(tilesetId, {
                default: {
                    experimental_clipping: {
                        planes: SIDE_PLANES,
                        ...boxProperties,
                        location: { ...boxProperties.location },
                    },
                }
            });
            resolve();
        });
    }
}

reearth.on("mousedown", (e) => {
    // Handle scale box
    if(e.layerId?.startsWith(`${boxId}-scale-point`)) {
        boxState.cursor = "nesw-resize";
        const index = Number(e.layerId.split("-").slice(-1)[0]);
        boxState.activeScalePointIndex = index;
        boxState.isScalePointClicked = true;
        updateBox();
    }
    // Handle edge
    if(e.layerId?.startsWith(`${boxId}-edge-draggable`)) {
        boxState.cursor = "grabbing";
        const index = Number(e.layerId.split("-").slice(-1)[0]);
        boxState.activeEdgeIndex = index;
        boxState.isEdgeClicked = true;
        updateBox();
    }

    if(e.layerId?.startsWith(`${boxId}-plane`)) {
        isBoxClicked = true;
        isTopBottomSidePlaneClicked = e.layerId.endsWith("top") || e.layerId.endsWith("bottom");
    }
    if(isBoxClicked) {
        const cameraPosition = reearth.camera.position;
        currentCameraPosition = { ...cameraPosition };
        lookAt(currentCameraPosition);
        
        if(!boxState.isScalePointClicked || !boxState.isEdgeClicked) {
            boxState.cursor = "grabbing";
            boxState.activeBox = true;
            updateBox();
        }
    }
});
reearth.on("mouseup", (e) => {
    if(boxState.activeScalePointIndex || boxState.activeEdgeIndex) {
        boxState.cursor = "default";

        // Handle scale box
        boxState.activeScalePointIndex = undefined;
        boxState.isScalePointClicked = false;
        // Handle edge
        boxState.activeEdgeIndex = undefined;
        boxState.isEdgeClicked = false;
        
        updateBox();
    }

    if(isBoxClicked) {
        // TODO: Fix to use `animation: false`.
        // This is workaround because if we use `lookAt` with `animation: false`, zooming interaction is freeze.
        reearth.camera.lookAt(currentCameraPosition, { duration: 0 });
        currentCameraPosition = null;
        isBoxClicked = false;
        isTopBottomSidePlaneClicked = false;
        prevY = null;
        
        boxState.activeBox = false;
        boxState.cursor = "default";
        updateBox();
    }
});
reearth.on("mousemove", (e) => {
    if(!isBoxClicked) return;
    if(!prevY) {
        prevY = e.y;
    }

    if(isTopBottomSidePlaneClicked) {
        const scale = (() => {
            if(!allowEnterGround()) {
                return reearth.camera.position.height / boxProperties.location.height;
            }
            return Math.floor(boxProperties.location.height) > 5 ? reearth.camera.position.height / boxProperties.location.height : 1;
        })();
        boxProperties.location.height = Math.max(boxProperties.location.height + (prevY - e.y) * scale, 1);
        prevY = e.y;
    } else {
        boxProperties.location.lat = e.lat;
        boxProperties.location.lng = e.lng;
    }

    lookAt(currentCameraPosition);

    updateBox(true);
});
reearth.on("mouseenter", (e) => {
    const enableEnterHandling = !boxState.isScalePointClicked && !boxState.isEdgeClicked && !isBoxClicked;
    // Handle scale box
    if(e.layerId?.startsWith(`${boxId}-scale-point`)) {
        if(enableEnterHandling) {
            boxState.cursor = "nesw-resize";
            const index = Number(e.layerId.split("-").slice(-1)[0]);
            boxState.activeScalePointIndex = index;
            updateBox();
        }
    }
    // Handle edge
    if(e.layerId?.startsWith(`${boxId}-edge-draggable`)) {
        if(enableEnterHandling) {
            boxState.cursor = "grab";
            const index = Number(e.layerId.split("-").slice(-1)[0]);
            boxState.activeEdgeIndex = index;
            updateBox();
        }
    }

    if(e.layerId?.startsWith(`${boxId}-plane`)) {
        if(enableEnterHandling) {
            boxState.cursor = "grab";
            boxState.activeBox = true;
            updateBox();
        }
    }
});
reearth.on("mouseleave", (e) => {
    const enableLeaveHandling = !boxState.isScalePointClicked && !boxState.isEdgeClicked && !isBoxClicked;
    // Handle scale box
    if(e.layerId?.startsWith(`${boxId}-scale-point`)) {
        if(enableLeaveHandling) {
            boxState.cursor = "default";
            boxState.activeScalePointIndex = undefined;
            updateBox();
        }
    }
    // Handle edge
    if(e.layerId?.startsWith(`${boxId}-edge-draggable`)) {
        if(enableLeaveHandling) {
            boxState.cursor = "default";
            boxState.activeEdgeIndex = undefined;
            updateBox();
        }
    }

    if(e.layerId?.startsWith(`${boxId}-plane`)) {
        if(enableLeaveHandling) {
            boxState.cursor = "default";
            boxState.activeBox = false;
            updateBox();
        }
    }
});

reearth.on("layeredit", (e) => {
    if(e.layerId?.startsWith(`${boxId}-scale-point`) && e.scale) {
        lookAt(currentCameraPosition);
    
        const scale = e.scale;

        boxProperties.width = scale.width;
        boxProperties.height = scale.height;
        boxProperties.length = scale.length;
        boxProperties.location.lng = scale.location.lng;
        boxProperties.location.lat = scale.location.lat;
        boxProperties.location.height = scale.location.height;
    
        updateBox(true);
    }

    if(e.layerId?.startsWith(`${boxId}-edge-draggable`) && e.rotation) {
        lookAt(currentCameraPosition);

        const rotation = e.rotation;

        boxProperties.heading = rotation.heading;
        boxProperties.pitch = rotation.pitch;
        boxProperties.roll = rotation.roll;

        updateBox(true);
    }
});
