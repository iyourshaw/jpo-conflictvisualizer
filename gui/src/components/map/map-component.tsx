import React, { useState, useEffect } from "react";
import Map, { Source, Layer } from "react-map-gl";

import { Container, Col } from "reactstrap";

import { Paper, Box, Typography } from "@mui/material";

// import mapMessageData from "./processed_map_v4.json";
import type { CircleLayer, LayerProps, LineLayer, SymbolLayer } from "react-map-gl";
import ControlPanel from "./control-panel";
import MessageMonitorApi from "../../apis/mm-api";
import EventsApi from "../../apis/events-api";
import NotificationApi from "../../apis/notification-api";
import { SidePanel } from "./side-panel";
import { CustomPopup } from "./popup";
import { useSession } from "next-auth/react";
import getConfig from "next/config";
import { generateColorDictionary, generateMapboxStyleExpression } from "./utilities/colors";
import { MapLegend } from "./map-legend";
import toast from "react-hot-toast";
import JSZip from "jszip";
import FileSaver from "file-saver";
const { publicRuntimeConfig } = getConfig();

const allInteractiveLayerIds = ["mapMessage", "connectingLanes", "signalStates", "bsm"];

const mapMessageLayer: LineLayer = {
  id: "mapMessage",
  type: "line",
  paint: {
    "line-width": 5,
    "line-color": ["case", ["==", ["get", "ingressPath"], true], "#eb34e8", "#0004ff"],
  },
};

const mapMessageLabelsLayer: SymbolLayer = {
  id: "mapMessageLabels",
  type: "symbol",
  layout: {
    "text-field": ["concat", "lane: ", ["to-string", ["get", "laneId"]]],
    "text-size": 20,
    // "text-offset": [0, 1],
    "text-variable-anchor": ["top", "left", "right", "bottom"],
    "text-allow-overlap": true,
    "icon-allow-overlap": true,
  },
  paint: {
    "text-color": "#000000",
    "text-halo-color": "#ffffff",
    "text-halo-width": 5,
  },
};

const connectingLanesLayer: LineLayer = {
  id: "connectingLanes",
  type: "line",
  paint: {
    "line-width": [
      "match",
      ["get", "signalState"],
      "UNAVAILABLE",
      3,
      "DARK",
      3,
      "STOP_THEN_PROCEED",
      3,
      "STOP_AND_REMAIN",
      3,
      "PRE_MOVEMENT",
      5,
      "PERMISSIVE_MOVEMENT_ALLOWED",
      5,
      "PROTECTED_MOVEMENT_ALLOWED",
      5,
      "PERMISSIVE_CLEARANCE",
      5,
      "PROTECTED_CLEARANCE",
      5,
      "CAUTION_CONFLICTING_TRAFFIC",
      5,
      5,
    ],
    "line-color": [
      "match",
      ["get", "signalState"],
      "UNAVAILABLE",
      "#797979",
      "DARK",
      "#3a3a3a",
      "STOP_THEN_PROCEED",
      "#c00000",
      "STOP_AND_REMAIN",
      "#c00000",
      "PRE_MOVEMENT",
      "#c00000",
      "PERMISSIVE_MOVEMENT_ALLOWED",
      "#267700",
      "PROTECTED_MOVEMENT_ALLOWED",
      "#267700",
      "PERMISSIVE_CLEARANCE",
      "#e6b000",
      "PROTECTED_CLEARANCE",
      "#e6b000",
      "CAUTION_CONFLICTING_TRAFFIC",
      "#e6b000",
      "#797979",
    ],
    "line-dasharray": [
      "match",
      ["get", "signalState"],
      "UNAVAILABLE",
      ["literal", [2, 1]],
      "DARK",
      ["literal", [2, 1]],
      "STOP_THEN_PROCEED",
      ["literal", [2, 1]],
      "STOP_AND_REMAIN",
      ["literal", [1]],
      "PRE_MOVEMENT",
      ["literal", [2, 2]],
      "PERMISSIVE_MOVEMENT_ALLOWED",
      ["literal", [2, 1]],
      "PROTECTED_MOVEMENT_ALLOWED",
      ["literal", [1]],
      "PERMISSIVE_CLEARANCE",
      ["literal", [2, 1]],
      "PROTECTED_CLEARANCE",
      ["literal", [1]],
      "CAUTION_CONFLICTING_TRAFFIC",
      ["literal", [1, 4]],
      ["literal", [2, 1]],
    ],
  },
};

const connectingLanesLabelsLayer: SymbolLayer = {
  id: "connectingLanesLabels",
  type: "symbol",
  layout: {
    "text-field": ["concat", "sig-group: ", ["to-string", ["get", "signalGroupId"]]],
    "text-size": 20,
    "text-offset": [0, 1],
    "text-variable-anchor": ["top", "left", "right", "bottom"],
    "text-allow-overlap": true,
    "icon-allow-overlap": true,
    "icon-image": "rounded",
    "icon-text-fit": "both",
  },
  paint: {
    "text-color": "#000000",
    "text-halo-color": "#ffffff",
    "text-halo-width": 5,
  },
};

const RED_LIGHT = "RED_LIGHT";
const YELLOW_LIGHT = "YELLOW_LIGHT";
const GREEN_LIGHT = "GREEN_LIGHT";
const YELLOW_RED_LIGHT = "YELLOW_RED_LIGHT";
const RED_FLASHING_LIGHT = "RED_FLASHING_LIGHT";
const UNKNOWN_LIGHT = "UNKNOWN_LIGHT";

const markerLayer: LayerProps = {
  id: "invalidLaneCollection",
  type: "line",
  paint: {
    "line-width": 20,
    "line-color": "#d40000",
    // "line-dasharray": [2, 1],
  },
};

const generateQueryParams = (
  source: MessageMonitor.Notification | MessageMonitor.Event | Assessment | timestamp | undefined,
  sourceDataType: "notification" | "event" | "assessment" | "timestamp" | undefined
) => {
  const startOffset = 1000 * 60 * 1;
  const endOffset = 1000 * 60 * 1;

  switch (sourceDataType) {
    case "notification":
      const notification = source as MessageMonitor.Notification;
      return {
        startDate: new Date(notification.notificationGeneratedAt - startOffset),
        endDate: new Date(notification.notificationGeneratedAt + endOffset),
        eventDate: new Date(notification.notificationGeneratedAt),
        vehicleId: undefined,
      };
    case "event":
      const event = source as MessageMonitor.Event;
      return {
        startDate: new Date(event.eventGeneratedAt - startOffset),
        endDate: new Date(event.eventGeneratedAt + endOffset),
        eventDate: new Date(event.eventGeneratedAt),
        vehicleId: undefined,
      };
    case "assessment":
      const assessment = source as Assessment;
      return {
        startDate: new Date(assessment.assessmentGeneratedAt - startOffset),
        endDate: new Date(assessment.assessmentGeneratedAt + endOffset),
        eventDate: new Date(assessment.assessmentGeneratedAt),
        vehicleId: undefined,
      };
    case "timestamp":
      const ts = (source as timestamp).timestamp;
      return {
        startDate: new Date(ts - startOffset),
        endDate: new Date(ts + endOffset),
        eventDate: new Date(ts),
        vehicleId: undefined,
      };
    default:
      return {
        startDate: new Date(Date.now() - startOffset),
        endDate: new Date(Date.now() + endOffset),
        eventDate: new Date(Date.now()),
        vehicleId: undefined,
      };
  }
};

type timestamp = {
  timestamp: number;
};

type MyProps = {
  sourceData: MessageMonitor.Notification | MessageMonitor.Event | Assessment | timestamp | undefined;
  sourceDataType: "notification" | "event" | "assessment" | "timestamp" | undefined;
  intersectionId: number | undefined;
  loadOnNull?: boolean;
};

const MapTab = (props: MyProps) => {
  const MAPBOX_API_TOKEN = publicRuntimeConfig.MAPBOX_TOKEN!;

  const [queryParams, setQueryParams] = useState<{
    startDate: Date;
    endDate: Date;
    eventDate: Date;
    vehicleId?: string;
    intersectionId?: number;
  }>({ ...generateQueryParams(props.sourceData, props.sourceDataType), intersectionId: props.intersectionId });

  const [mapLegendColors, setMapLegendColors] = useState<{
    bsmColors: { [key: string]: string };
    laneColors: { [key: string]: string };
    travelConnectionColors: { [key: string]: [string, number[]] };
    signalHeadIcons: { [key: string]: string };
  }>({
    bsmColors: { Other: "#0004ff" },
    laneColors: {
      Ingress: "#eb34e8",
      Egress: "#0004ff",
    },
    travelConnectionColors: {
      UNAVAILABLE: ["#797979", [2, 1]],
      DARK: ["#3a3a3a", [2, 1]],
      STOP_THEN_PROCEED: ["#c00000", [2, 1]],
      STOP_AND_REMAIN: ["#c00000", [1]],
      PRE_MOVEMENT: ["#c00000", [2, 2]],
      PERMISSIVE_MOVEMENT_ALLOWED: ["#267700", [2, 1]],
      PROTECTED_MOVEMENT_ALLOWED: ["#267700", [1]],
      PERMISSIVE_CLEARANCE: ["#e6b000", [2, 1]],
      PROTECTED_CLEARANCE: ["#e6b000", [1]],
      CAUTION_CONFLICTING_TRAFFIC: ["#e6b000", [1, 4]],
    },
    signalHeadIcons: {
      UNAVAILABLE: "/icons/traffic-light-icon-unknown.svg",
      DARK: "/icons/traffic-light-icon-unknown.svg",
      STOP_THEN_PROCEED: "/icons/traffic-light-icon-red-flashing.svg",
      STOP_AND_REMAIN: "/icons/traffic-light-icon-red-1.svg",
      PRE_MOVEMENT: "/icons/traffic-light-icon-yellow-red-1.svg",
      PERMISSIVE_MOVEMENT_ALLOWED: "/icons/traffic-light-icon-yellow-1.svg",
      PROTECTED_MOVEMENT_ALLOWED: "/icons/traffic-light-icon-green-1.svg",
      PERMISSIVE_CLEARANCE: "/icons/traffic-light-icon-yellow-1.svg",
      PROTECTED_CLEARANCE: "/icons/traffic-light-icon-yellow-1.svg",
      CAUTION_CONFLICTING_TRAFFIC: "/icons/traffic-light-icon-yellow-1.svg",

      // "UNAVAILABLE": "traffic-light-icon-unknown",
      // "DARK": "traffic-light-icon-unknown",
      // "STOP_THEN_PROCEED": "traffic-light-icon-red-flashing",
      // "STOP_AND_REMAIN": "traffic-light-icon-red-1",
      // "PRE_MOVEMENT": "traffic-light-icon-yellow-red-1",
      // "PERMISSIVE_MOVEMENT_ALLOWED": "traffic-light-icon-yellow-1",
      // "PROTECTED_MOVEMENT_ALLOWED": "traffic-light-icon-green-1",
      // "PERMISSIVE_CLEARANCE": "traffic-light-icon-yellow-1",
      // "PROTECTED_CLEARANCE": "traffic-light-icon-yellow-1",
      // "CAUTION_CONFLICTING_TRAFFIC": "traffic-light-icon-yellow-1",
    },
  });

  const [bsmLayerStyle, setBsmLayerStyle] = useState<CircleLayer>({
    id: "bsm",
    type: "circle",
    paint: {
      "circle-color": ["match", ["get", "id"], "temp-id", "#0004ff", "#0004ff"],
      "circle-radius": 8,
    },
  });

  const [signalStateLayer, setSignalStateLayer] = useState<LayerProps>({
    id: "signalStates",
    type: "symbol",
    layout: {
      "icon-image": [
        "match",
        ["get", "signalState"],
        "UNAVAILABLE",
        "traffic-light-icon-unknown",
        "DARK",
        "traffic-light-icon-unknown",
        "STOP_THEN_PROCEED",
        "traffic-light-icon-red-flashing",
        "STOP_AND_REMAIN",
        "traffic-light-icon-red-1",
        "PRE_MOVEMENT",
        "traffic-light-icon-yellow-red-1",
        "PERMISSIVE_MOVEMENT_ALLOWED",
        "traffic-light-icon-yellow-1",
        "PROTECTED_MOVEMENT_ALLOWED",
        "traffic-light-icon-green-1",
        "PERMISSIVE_CLEARANCE",
        "traffic-light-icon-yellow-1",
        "PROTECTED_CLEARANCE",
        "traffic-light-icon-yellow-1",
        "CAUTION_CONFLICTING_TRAFFIC",
        "traffic-light-icon-yellow-1",
        "traffic-light-icon-unknown",
      ],
      "icon-rotate": ["get", "orientation"],
      "icon-allow-overlap": true,
      "icon-rotation-alignment": "map",
      "icon-size": ["interpolate", ["linear"], ["zoom"], 0, 0, 9, 0.01, 19, 0.15, 22, 0.4],
    },
  });

  const [mapData, setMapData] = useState<ProcessedMap>();
  const [mapSignalGroups, setMapSignalGroups] = useState<SignalStateFeatureCollection>();
  const [signalStateData, setSignalStateData] = useState<SignalStateFeatureCollection>();
  const [spatSignalGroups, setSpatSignalGroups] = useState<SpatSignalGroups>();
  const [currentSignalGroups, setCurrentSignalGroups] = useState<SpatSignalGroup[]>();
  const [currentBsms, setCurrentBsms] = useState<BsmFeatureCollection>({
    type: "FeatureCollection" as "FeatureCollection",
    features: [],
  });
  const [connectingLanes, setConnectingLanes] = useState<ConnectingLanesFeatureCollection>();
  const [bsmData, setBsmData] = useState<BsmFeatureCollection>({
    type: "FeatureCollection" as "FeatureCollection",
    features: [],
  });
  const [surroundingEvents, setSurroundingEvents] = useState<MessageMonitor.Event[]>([]);
  const [filteredSurroundingEvents, setFilteredSurroundingEvents] = useState<MessageMonitor.Event[]>([]);
  const [surroundingNotifications, setSurroundingNotifications] = useState<MessageMonitor.Notification[]>([]);
  const [filteredSurroundingNotifications, setFilteredSurroundingNotifications] = useState<
    MessageMonitor.Notification[]
  >([]);
  //   const mapRef = useRef<mapboxgl.Map>();
  const [viewState, setViewState] = useState({
    latitude: 39.587905,
    longitude: -105.0907089,
    zoom: 19,
  });
  const [timeWindowSeconds, setTimeWindowSeconds] = useState<number>(60);
  const [sliderValue, setSliderValue] = useState<number>(0);
  const [renderTimeInterval, setRenderTimeInterval] = useState<number[]>([0, 0]);
  const mapRef = React.useRef<any>(null);
  const [hoveredFeature, setHoveredFeature] = useState<any>(undefined);
  const [selectedFeature, setSelectedFeature] = useState<any>(undefined);
  const [rawData, setRawData] = useState({});
  const [mapSpatTimes, setMapSpatTimes] = useState({ mapTime: 0, spatTime: 0 });
  const [sigGroupLabelsVisible, setSigGroupLabelsVisible] = useState<boolean>(false);
  const [laneLabelsVisible, setLaneLabelsVisible] = useState<boolean>(false);
  const [showPopupOnHover, setShowPopupOnHover] = useState<boolean>(false);
  const [importedMessageData, setImportedMessageData] = useState<
    | {
        mapData: ProcessedMap[];
        bsmData: OdeBsmData[];
        spatData: ProcessedSpat[];
        notificationData: any;
      }
    | undefined
  >(undefined);
  const [cursor, setCursor] = useState<string>("default");

  const [loadInitialDataTimeoutId, setLoadInitialdataTimeoutId] = useState<NodeJS.Timeout | undefined>(undefined);
  const { data: session } = useSession();

  useEffect(() => {
    console.debug("SELECTED FEATURE", selectedFeature);
  }, [selectedFeature]);

  function deg2rad(deg) {
    return deg * (Math.PI / 180);
  }

  function rad2deg(rad) {
    return rad * (180 / Math.PI);
  }

  // get bearing between two lat/long points
  function getBearingBetweenPoints(start, end) {
    if (!start || !end) return 0;
    const lat1 = deg2rad(start[1]!);
    const lon1 = deg2rad(start[0]!);
    const lat2 = deg2rad(end[1]!);
    const lon2 = deg2rad(end[0]!);
    const dLon = lon2 - lon1;
    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    const brng = Math.atan2(y, x);
    return rad2deg(brng);
  }

  const parseMapSignalGroups = (
    mapMessage: ProcessedMap,
    connectingLanes: ConnectingLanesFeatureCollection
  ): SignalStateFeatureCollection => {
    const features: SignalStateFeature[] = [];

    mapMessage?.mapFeatureCollection?.features?.forEach((mapFeature: MapFeature) => {
      if (!mapFeature.properties.ingressApproach || !mapFeature?.properties?.connectsTo?.[0]?.signalGroup) {
        return;
      }
      const coords = mapFeature.geometry.coordinates.slice(0, 2);
      features.push({
        type: "Feature",
        properties: {
          signalGroup: mapFeature.properties.connectsTo[0].signalGroup,
          intersectionId: mapMessage.properties.intersectionId,
          orientation: getBearingBetweenPoints(coords[1], coords[0]),
          signalState: "UNAVAILABLE",
        },
        geometry: {
          type: "Point",
          coordinates: mapFeature.geometry.coordinates[0],
        },
      });
    });

    return {
      type: "FeatureCollection" as "FeatureCollection",
      features: features,
    };
  };

  const createMarkerForNotification = (
    center: number[],
    notification: MessageMonitor.Notification,
    connectingLanes: MapFeatureCollection
  ) => {
    const features: any[] = [];
    const markerCollection = {
      type: "FeatureCollection" as "FeatureCollection",
      features: features,
    };
    switch (notification.notificationType) {
      case "ConnectionOfTravelNotification":
        // TODO: Re-add once more notification data is available
        // const connTravelNotification = notification as ConnectionOfTravelNotification;
        // const connTravelAssessmentGroups = connTravelNotification.assessment.connectionOfTravelAssessmentGroups;
        // connTravelAssessmentGroups?.forEach((assessmentGroup) => {
        //   const ingressLocation: number[] | undefined = connectingLanes.features.find(
        //     (connectingLaneFeature: MapFeature) => {
        //       return connectingLaneFeature.properties.laneId === assessmentGroup.ingressLaneID;
        //     }
        //   )?.geometry.coordinates[0];
        //   const egressLocation: number[] | undefined = connectingLanes.features.find(
        //     (connectingLaneFeature: MapFeature) => {
        //       return connectingLaneFeature.properties.laneId === assessmentGroup.egressLaneID;
        //     }
        //   )?.geometry.coordinates[0];
        //   if (!ingressLocation || !egressLocation) return;
        //   const marker = {
        //     type: "Feature",
        //     properties: {
        //       description: `${connTravelNotification.notificationText}, egress lane ${assessmentGroup.egressLaneID}, ingress lane ${assessmentGroup.ingressLaneID}, connection ID ${assessmentGroup.connectionID}, event count ${assessmentGroup.eventCount}`,
        //       title: connTravelNotification.notificationType,
        //     },
        //     geometry: {
        //       type: "LineString",
        //       coordinates: [ingressLocation, egressLocation],
        //     },
        //   };
        //   markerCollection.features.push(marker);
        // });
        break;
      case "IntersectionReferenceAlignmentNotification":
        // No markers for this notification
        break;
      case "LaneDirectionOfTravelNotification":
        const laneDirTravelNotification = notification as LaneDirectionOfTravelNotification;
        const laneDirTravelAssessmentGroups = laneDirTravelNotification.assessment.laneDirectionOfTravelAssessmentGroup;
        laneDirTravelAssessmentGroups?.forEach((assessmentGroup) => {
          const laneLocation: number[] | undefined = connectingLanes.features.find(
            (connectingLaneFeature: MapFeature) => {
              return connectingLaneFeature.properties.laneId === assessmentGroup.laneID;
            }
          )?.geometry.coordinates[0];
          if (!laneLocation) return;
          const numEvents = assessmentGroup.inToleranceEvents + assessmentGroup.outOfToleranceEvents;
          const eventsRatio = assessmentGroup.inToleranceEvents / numEvents;
          const marker = {
            type: "Feature",
            properties: {
              description: `${laneDirTravelNotification.notificationText}, lane ID ${assessmentGroup.laneID}, in tolerance events ${eventsRatio} (${assessmentGroup.inToleranceEvents}/${numEvents})`,
              title: laneDirTravelNotification.notificationType,
            },
            geometry: {
              type: "Point",
              coordinates: laneLocation,
            },
          };
          markerCollection.features.push(marker);
        });
        break;
      case "SignalGroupAlignmentNotification":
        // No markers for this notification
        break;
      case "SignalStateConflictNotification":
        const sigStateConflictNotification = notification as SignalStateConflictNotification;
        const sigStateConflictEvent = sigStateConflictNotification.event;
        const sigStateConflictMarker = {
          type: "Feature",
          properties: {
            description: `${sigStateConflictNotification.notificationText}, Conflict type ${sigStateConflictEvent.conflictType}, First conflicting signal state ${sigStateConflictEvent.firstConflictingSignalState} of group ${sigStateConflictEvent.firstConflictingSignalGroup}, Second conflicting signal state ${sigStateConflictEvent.secondConflictingSignalState} of group ${sigStateConflictEvent.secondConflictingSignalGroup}`,
            title: sigStateConflictNotification.notificationType,
          },
          geometry: {
            type: "Point",
            coordinates: center,
          },
        };
        markerCollection.features.push(sigStateConflictMarker);
        break;
      case "TimeChangeDetailsNotification":
        // No markers for this notification
        break;
      case "KafkaStreamsAnomalyNotification":
        // No markers for this notification
        break;
      case "BroadcastRateNotification":
        // No markers for this notification
        break;
    }
    return markerCollection;
  };

  const parseSpatSignalGroups = (spats: ProcessedSpat[]): SpatSignalGroups => {
    const timedSignalGroups: SpatSignalGroups = {};
    spats?.forEach((spat: ProcessedSpat) => {
      timedSignalGroups[Date.parse(spat.odeReceivedAt)] = spat.states.map((state) => {
        return {
          signalGroup: state.signalGroup,
          state: state.stateTimeSpeed?.[0]?.eventState as SignalState,
        };
      });
    });
    return timedSignalGroups;
  };

  const parseBsmToGeojson = (bsmData: OdeBsmData[]): BsmFeatureCollection => {
    return {
      type: "FeatureCollection" as "FeatureCollection",
      features: bsmData.map((bsm) => {
        return {
          type: "Feature",
          properties: {
            ...bsm.payload.data.coreData,
            odeReceivedAt: new Date(bsm.metadata.odeReceivedAt as string).getTime() / 1000,
          },
          geometry: {
            type: "Point",
            coordinates: [bsm.payload.data.coreData.position.longitude, bsm.payload.data.coreData.position.latitude],
          },
        };
      }),
    };
  };

  const addConnections = (
    connectingLanes: ConnectingLanesFeatureCollection,
    signalGroups: SpatSignalGroup[]
  ): ConnectingLanesFeatureCollectionWithSignalState => {
    return {
      ...connectingLanes,
      features: connectingLanes.features.map((feature) => ({
        ...feature,
        properties: {
          ...feature.properties,
          signalState: signalGroups.find((signalGroup) => signalGroup.signalGroup == feature.properties.signalGroupId)
            ?.state,
        },
      })),
    };
  };

  const generateSignalStateFeatureCollection = (
    prevSignalStates: SignalStateFeatureCollection,
    signalGroups: SpatSignalGroup[]
  ): SignalStateFeatureCollection => {
    return {
      ...prevSignalStates,
      features: (prevSignalStates?.features ?? []).map((feature) => ({
        ...feature,
        properties: {
          ...feature.properties,
          signalState:
            signalGroups?.find((signalGroup) => signalGroup.signalGroup == feature.properties.signalGroup)?.state ??
            "UNAVAILABLE",
        },
      })),
    };
  };

  const handleImportedMessageData = ({
    mapData,
    bsmData,
    spatData,
    notificationData,
  }: {
    mapData: ProcessedMap[];
    bsmData: OdeBsmData[];
    spatData: ProcessedSpat[];
    notificationData: any;
  }) => {
    console.log("handleImportedMessageData");
    const sortedSpatData = spatData.sort((x, y) => {
      if (x.odeReceivedAt < y.odeReceivedAt) {
        return 1;
      }
      if (x.odeReceivedAt > y.odeReceivedAt) {
        return -1;
      }
      return 0;
    });
    const endTime = new Date(sortedSpatData[0].odeReceivedAt);
    const startTime = new Date(sortedSpatData[sortedSpatData.length - 1].odeReceivedAt);
    setImportedMessageData({ mapData, bsmData, spatData, notificationData });
    console.log("Imported Data Changed");
    setQueryParams({
      startDate: startTime,
      endDate: endTime,
      eventDate: startTime,
      intersectionId: mapData[0].properties.intersectionId,
    });
  };

  const pullInitialData = async () => {
    if (
      !session?.accessToken ||
      !queryParams.intersectionId ||
      (props.sourceData == undefined && props.loadOnNull == false)
    ) {
      console.error(
        "Did not attempt to pull initial map data. Access token:",
        session?.accessToken,
        "Intersection ID:",
        queryParams.intersectionId
      );
      return;
    }
    console.log("Pulling Initial Data");
    let rawMap: ProcessedMap[] = [];
    let rawSpat: ProcessedSpat[] = [];
    let rawBsm: OdeBsmData[] = [];
    if (!importedMessageData) {
      // ######################### Retrieve MAP Data #########################
      const rawMapPromise = MessageMonitorApi.getMapMessages({
        token: session?.accessToken,
        intersection_id: queryParams.intersectionId?.toString(),
        //startTime: new Date(queryParams.startDate.getTime() - 1000 * 60 * 60 * 1),
        endTime: queryParams.endDate,
        latest: true,
      });
      toast.promise(rawMapPromise, {
        loading: `Loading MAP Data`,
        success: `Successfully got MAP Data`,
        error: `Failed to get MAP data. Please see console`,
      });
      rawMap = await rawMapPromise;

      // ######################### Retrieve SPAT Data #########################
      const rawSpatPromise = MessageMonitorApi.getSpatMessages({
        token: session?.accessToken,
        intersection_id: queryParams.intersectionId?.toString(),
        startTime: queryParams.startDate,
        endTime: queryParams.endDate,
      });
      toast.promise(rawSpatPromise, {
        loading: `Loading SPAT Data`,
        success: `Successfully got SPAT Data`,
        error: `Failed to get SPAT data. Please see console`,
      });
      rawSpat = await rawSpatPromise;

      // ######################### Surrounding Events #########################
      const surroundingEventsPromise = EventsApi.getAllEvents(
        session?.accessToken,
        queryParams.intersectionId,
        queryParams.startDate,
        queryParams.endDate
      );
      toast.promise(surroundingEventsPromise, {
        loading: `Loading Event Data`,
        success: `Successfully got Event Data`,
        error: `Failed to get Event data. Please see console`,
      });
      surroundingEventsPromise.then((events) => setSurroundingEvents(events));

      // ######################### Surrounding Notifications #########################
      const surroundingNotificationsPromise = NotificationApi.getAllNotifications({
        token: session?.accessToken,
        intersection_id: queryParams.intersectionId?.toString(),
        startTime: queryParams.startDate,
        endTime: queryParams.endDate,
      });
      toast.promise(surroundingNotificationsPromise, {
        loading: `Loading Notification Data`,
        success: `Successfully got Notification Data`,
        error: `Failed to get Notification data. Please see console`,
      });
      surroundingNotificationsPromise.then((notifications) => setSurroundingNotifications(notifications));
    } else {
      rawMap = importedMessageData.mapData;
      rawSpat = importedMessageData.spatData;
      rawBsm = importedMessageData.bsmData;
    }
    if (!rawMap || rawMap.length == 0) {
      console.info("NO MAP MESSAGES WITHIN TIME");
      return;
    }

    // ######################### MAP Data #########################
    const latestMapMessage: ProcessedMap = rawMap.at(-1)!;
    const mapCoordinates: OdePosition3D = latestMapMessage?.properties.refPoint;

    // ######################### SPAT Signal Groups #########################
    setConnectingLanes(latestMapMessage.connectingLanesFeatureCollection);
    const mapSignalGroupsLocal = parseMapSignalGroups(latestMapMessage, connectingLanes!);
    setMapData(latestMapMessage);
    setMapSpatTimes((prevValue) => ({
      ...prevValue,
      mapTime: latestMapMessage.properties.odeReceivedAt as unknown as number,
    }));
    setMapSignalGroups(mapSignalGroupsLocal);
    if (latestMapMessage != null) {
      setViewState({
        latitude: latestMapMessage?.properties.refPoint.latitude,
        longitude: latestMapMessage?.properties.refPoint.longitude,
        zoom: 19,
      });
    }

    const spatSignalGroupsLocal = parseSpatSignalGroups(rawSpat);

    setSpatSignalGroups(spatSignalGroupsLocal);

    // ######################### BSMs #########################
    if (!importedMessageData) {
      const rawBsmPromise = MessageMonitorApi.getBsmMessages({
        token: session?.accessToken,
        vehicleId: queryParams.vehicleId,
        startTime: queryParams.startDate,
        endTime: queryParams.endDate,
        long: mapCoordinates.longitude,
        lat: mapCoordinates.latitude,
        distance: 500,
      });
      toast.promise(rawBsmPromise, {
        loading: `Loading BSM Data`,
        success: `Successfully got BSM Data`,
        error: `Failed to get BSM data. Please see console`,
      });
      rawBsm = await rawBsmPromise;
    }
    const bsmGeojson = parseBsmToGeojson(rawBsm);
    const uniqueIds = new Set(bsmGeojson.features.map((bsm) => bsm.properties?.id));
    // generate equally spaced unique colors for each uniqueId
    const colors = generateColorDictionary(uniqueIds);
    setMapLegendColors((prevValue) => ({
      ...prevValue,
      bsmColors: colors,
    }));
    // add color to each feature
    const bsmLayerStyle = generateMapboxStyleExpression(colors);
    setBsmLayerStyle((prevValue) => ({ ...prevValue, paint: { ...prevValue.paint, "circle-color": bsmLayerStyle } }));
    setBsmData(bsmGeojson);

    // ######################### Message Data #########################
    rawData["map"] = rawMap;
    rawData["spat"] = rawSpat;
    rawData["bsm"] = rawBsm;
    if (props.sourceDataType == "notification") {
      rawData["notification"] = props.sourceData;
    } else if (props.sourceDataType == "event") {
      rawData["event"] = props.sourceData;
    } else if (props.sourceDataType == "assessment") {
      rawData["assessment"] = props.sourceData;
    }
    setRawData(rawData);

    // ######################### Set Slider Position #########################
    setSliderValue(
      Math.min(
        getTimeRange(queryParams.startDate, queryParams.eventDate ?? new Date()),
        getTimeRange(queryParams.startDate, queryParams.endDate)
      )
    );
  };

  useEffect(() => {
    if (props.intersectionId != queryParams.intersectionId) {
      const query_params = {
        ...queryParams,
        intersectionId: props.intersectionId,
      };
      console.log("Intersection ID changed");
      setQueryParams(query_params);
      setTimeWindowSeconds(60);
    }
  }, [props.intersectionId]);

  useEffect(() => {
    const newQueryParams = {
      ...generateQueryParams(props.sourceData, props.sourceDataType),
      intersectionId: props.intersectionId,
    };
    if (
      queryParams.startDate.getTime() != newQueryParams.startDate.getTime() ||
      queryParams.endDate.getTime() != newQueryParams.endDate.getTime() ||
      queryParams.eventDate.getTime() != newQueryParams.eventDate.getTime() ||
      queryParams.vehicleId != newQueryParams.vehicleId ||
      queryParams.intersectionId != newQueryParams.intersectionId
    ) {
      console.log("Source Data changed");
      setQueryParams(newQueryParams);
      setTimeWindowSeconds(60);
    }
  }, [props.sourceData]);

  useEffect(() => {
    console.log("Setting Timeout to Pull Initial Data");
    if (loadInitialDataTimeoutId) {
      clearTimeout(loadInitialDataTimeoutId);
    }
    setLoadInitialdataTimeoutId(setTimeout(pullInitialData, 500));
  }, [queryParams]);

  useEffect(() => {
    if (!mapSignalGroups || !spatSignalGroups) {
      console.error("BSM Loading: No map or SPAT data", mapSignalGroups, spatSignalGroups);
      return;
    }

    // retrieve filtered SPATs
    let closestSignalGroup: { spat: SpatSignalGroup[]; datetime: number } | null = null;
    for (const datetime in spatSignalGroups) {
      const datetimeNum = Number(datetime) / 1000;
      if (datetimeNum >= renderTimeInterval[0] && datetimeNum <= renderTimeInterval[1]) {
        if (
          closestSignalGroup === null ||
          Math.abs(datetimeNum - renderTimeInterval[1]) < Math.abs(closestSignalGroup.datetime - renderTimeInterval[1])
        ) {
          closestSignalGroup = { datetime: datetimeNum, spat: spatSignalGroups[datetime] };
        }
      }
    }
    if (closestSignalGroup !== null) {
      setCurrentSignalGroups(closestSignalGroup.spat);
      setSignalStateData(generateSignalStateFeatureCollection(mapSignalGroups, closestSignalGroup.spat));
      setMapSpatTimes((prevValue) => ({ ...prevValue, spatTime: closestSignalGroup!.datetime }));
    } else {
      setCurrentSignalGroups(undefined);
      setSignalStateData(undefined);
    }

    // retrieve filtered BSMs
    const filteredBsms: BsmFeature[] = [];
    (bsmData?.features ?? []).forEach((feature) => {
      if (
        feature.properties?.odeReceivedAt >= renderTimeInterval[0] &&
        feature.properties?.odeReceivedAt <= renderTimeInterval[1]
      ) {
        filteredBsms.push(feature);
      }
    });

    setCurrentBsms({ ...bsmData, features: filteredBsms });

    const filteredEvents: MessageMonitor.Event[] = [];
    surroundingEvents.forEach((event) => {
      if (
        event.eventGeneratedAt / 1000 >= renderTimeInterval[0] &&
        event.eventGeneratedAt / 1000 <= renderTimeInterval[1]
      ) {
        filteredEvents.push(event);
      }
    });
    setFilteredSurroundingEvents(filteredEvents);

    const filteredNotifications: MessageMonitor.Notification[] = [];
    surroundingNotifications.forEach((notification) => {
      if (
        notification.notificationGeneratedAt / 1000 >= renderTimeInterval[0] &&
        notification.notificationGeneratedAt / 1000 <= renderTimeInterval[1]
      ) {
        filteredNotifications.push(notification);
      }
    });
    setFilteredSurroundingNotifications(filteredNotifications);
  }, [bsmData, mapSignalGroups, renderTimeInterval, spatSignalGroups]);

  useEffect(() => {
    const startTime = queryParams.startDate.getTime() / 1000;
    const timeRange = getTimeRange(queryParams.startDate, queryParams.endDate);

    const filteredStartTime = startTime + sliderValue - timeWindowSeconds;
    const filteredEndTime = startTime + sliderValue;

    setRenderTimeInterval([filteredStartTime, filteredEndTime]);
  }, [sliderValue, queryParams, timeWindowSeconds]);

  const getTimeRange = (startDate: Date, endDate: Date) => {
    return (endDate.getTime() - startDate.getTime()) / 1000;
  };

  const handleSliderChange = (event: Event, newValue: number | number[]) => {
    setSliderValue(newValue as number);
  };

  const downloadJsonFile = (contents: any, name: string) => {
    const element = document.createElement("a");
    const file = new Blob([JSON.stringify(contents)], {
      type: "text/plain",
    });
    element.href = URL.createObjectURL(file);
    element.download = name;
    document.body.appendChild(element); // Required for this to work in FireFox
    element.click();
  };

  const downloadAllData = () => {
    var zip = new JSZip();
    zip.file(`intersection_${queryParams.intersectionId}_MAP_data.json`, JSON.stringify(rawData["map"]));
    zip.file(`intersection_${queryParams.intersectionId}_SPAT_data.json`, JSON.stringify(rawData["spat"]));
    zip.file(`intersection_${queryParams.intersectionId}_BSM_data.json`, JSON.stringify(rawData["bsm"]));
    zip.file(
      `intersection_${queryParams.intersectionId}_Notification_data.json`,
      JSON.stringify(rawData["notification"])
    );
    zip.generateAsync({ type: "blob" }).then(function (content) {
      FileSaver.saveAs(content, `intersection_${queryParams.intersectionId}_data.zip`);
    });
  };

  const onTimeQueryChanged = (
    eventTime: Date = new Date(),
    timeBefore?: number,
    timeAfter?: number,
    timeWindowSeconds?: number
  ) => {
    const updatedQueryParams = {
      startDate: new Date(eventTime.getTime() - (timeBefore ?? 0) * 1000),
      endDate: new Date(eventTime.getTime() + (timeAfter ?? 0) * 1000),
      eventDate: eventTime,
      intersectionId: queryParams.intersectionId,
    };
    if (
      queryParams.startDate.getTime() != updatedQueryParams.startDate.getTime() ||
      queryParams.endDate.getTime() != updatedQueryParams.endDate.getTime() ||
      queryParams.eventDate.getTime() != updatedQueryParams.eventDate.getTime()
    ) {
      // Detected change in query params
      console.log("Time Query Changed");
      setQueryParams(updatedQueryParams);
    } else {
      // No change in query params
    }
    setTimeWindowSeconds((prevState) => timeWindowSeconds ?? prevState);
  };

  const onClickMap = (e) => {
    const features = mapRef.current.queryRenderedFeatures(e.point, {
      //   layers: allInteractiveLayerIds,
    });
    const feature = features?.[0];
    if (feature && allInteractiveLayerIds.includes(feature.layer.id)) {
      setSelectedFeature({ clickedLocation: e.lngLat, feature });
    } else {
      setSelectedFeature(undefined);
    }
  };

  return (
    <Container fluid={true} style={{ width: "100%", height: "100%", display: "flex" }}>
      <Col className="mapContainer" style={{ overflow: "hidden" }}>
        <div
          style={{
            padding: "0px 0px 6px 12px",
            marginTop: "6px",
            marginLeft: "35px",
            position: "absolute",
            zIndex: 10,
            top: 0,
            left: 0,
            // width: 1200,
            width: "calc(100% - 500px)",
            borderRadius: "4px",
            fontSize: "16px",
            maxHeight: "calc(100vh - 120px)",
            overflow: "auto",
            scrollBehavior: "auto",
          }}
        >
          <Box style={{ position: "relative" }}>
            <Paper sx={{ pt: 1, pb: 1, opacity: 0.85 }}>
              <ControlPanel
                sx={{ flex: 0 }}
                sliderValue={sliderValue}
                sliderTimeValue={{
                  start: new Date((queryParams.startDate.getTime() / 1000 + sliderValue - timeWindowSeconds) * 1000),
                  end: new Date((queryParams.startDate.getTime() / 1000 + sliderValue) * 1000),
                }}
                setSlider={handleSliderChange}
                downloadAllData={downloadAllData}
                timeQueryParams={{ ...queryParams, timeWindowSeconds }}
                onTimeQueryChanged={onTimeQueryChanged}
                mapSpatTimes={mapSpatTimes}
                max={getTimeRange(queryParams.startDate, queryParams.endDate)}
                signalStateLayer={signalStateLayer}
                setSignalStateLayer={setSignalStateLayer}
                laneLabelsVisible={laneLabelsVisible}
                setLaneLabelsVisible={setLaneLabelsVisible}
                sigGroupLabelsVisible={sigGroupLabelsVisible}
                setSigGroupLabelsVisible={setSigGroupLabelsVisible}
                handleImportedMessageData={handleImportedMessageData}
                showPopupOnHover={showPopupOnHover}
                setShowPopupOnHover={setShowPopupOnHover}
              />
            </Paper>
          </Box>
        </div>
        <div
          style={{
            padding: "0px 0px 6px 12px",
            position: "absolute",
            zIndex: 9,
            bottom: 0,
            left: 0,
            fontSize: "16px",
            overflow: "auto",
            scrollBehavior: "auto",
            width: "100%",
          }}
        >
          <Box style={{ position: "relative" }}>
            <MapLegend
              bsmColors={mapLegendColors.bsmColors}
              laneColors={mapLegendColors.laneColors}
              travelConnectionColors={mapLegendColors.travelConnectionColors}
              signalHeadIcons={mapLegendColors.signalHeadIcons}
            />
          </Box>
        </div>

        <Map
          {...viewState}
          ref={mapRef}
          onLoad={() => {}}
          mapStyle={publicRuntimeConfig.MAPBOX_STYLE_URL!}
          mapboxAccessToken={MAPBOX_API_TOKEN}
          attributionControl={true}
          customAttribution={['<a href="https://www.cotrip.com/" target="_blank">© CDOT</a>']}
          styleDiffing
          style={{ width: "100%", height: "100%" }}
          onMove={(evt) => setViewState(evt.viewState)}
          onClick={onClickMap}
          // onMouseDown={this.onMouseDown}
          // onMouseUp={this.onMouseUp}
          interactiveLayerIds={allInteractiveLayerIds}
          cursor={cursor}
          onMouseMove={(e: mapboxgl.MapLayerMouseEvent) => {
            const feature = e.features?.[0];
            if (feature && allInteractiveLayerIds.includes(feature.layer.id)) {
              setHoveredFeature({ clickedLocation: e.lngLat, feature });
            }
          }}
          onMouseEnter={(e: mapboxgl.MapLayerMouseEvent) => {
            setCursor("pointer");
            const feature = e.features?.[0];
            if (feature && allInteractiveLayerIds.includes(feature.layer.id)) {
              setHoveredFeature({ clickedLocation: e.lngLat, feature });
            } else {
              setHoveredFeature(undefined);
            }
          }}
          onMouseLeave={(e: mapboxgl.MapLayerMouseEvent) => {
            setCursor("");
            setHoveredFeature(undefined);
          }}
        >
          {connectingLanes && currentSignalGroups && (
            <Source type="geojson" data={addConnections(connectingLanes, currentSignalGroups)}>
              <Layer {...connectingLanesLayer} />
            </Source>
          )}
          {connectingLanes && currentSignalGroups && sigGroupLabelsVisible && (
            <Source type="geojson" data={addConnections(connectingLanes, currentSignalGroups)}>
              <Layer {...connectingLanesLabelsLayer} />
            </Source>
          )}
          {currentBsms && (
            <Source type="geojson" data={currentBsms}>
              <Layer {...bsmLayerStyle} />
            </Source>
          )}
          {mapData && (
            <Source type="geojson" data={mapData?.mapFeatureCollection}>
              <Layer {...mapMessageLayer} />
            </Source>
          )}
          {mapData && laneLabelsVisible && (
            <Source type="geojson" data={mapData?.mapFeatureCollection}>
              <Layer {...mapMessageLabelsLayer} />
            </Source>
          )}
          {connectingLanes && currentSignalGroups && signalStateData && (
            <Source type="geojson" data={signalStateData}>
              <Layer {...signalStateLayer} />
            </Source>
          )}
          {mapData && props.sourceData && props.sourceDataType == "notification" && (
            <Source
              type="geojson"
              data={createMarkerForNotification(
                [0, 0],
                props.sourceData as MessageMonitor.Notification,
                mapData.mapFeatureCollection
              )}
            >
              <Layer {...markerLayer} />
            </Source>
          )}
          {selectedFeature && (
            <CustomPopup selectedFeature={selectedFeature} onClose={() => setSelectedFeature(undefined)} />
          )}
          {showPopupOnHover && hoveredFeature && !selectedFeature && (
            <CustomPopup selectedFeature={hoveredFeature} onClose={() => setHoveredFeature(undefined)} />
          )}
        </Map>
        <SidePanel
          laneInfo={connectingLanes}
          signalGroups={currentSignalGroups}
          bsms={currentBsms}
          events={filteredSurroundingEvents}
          notifications={filteredSurroundingNotifications}
          sourceData={props.sourceData}
          sourceDataType={props.sourceDataType}
        />
      </Col>
    </Container>
  );
};

export default MapTab;
