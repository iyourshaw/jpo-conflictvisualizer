import React, { useState, useEffect } from "react";
import Map, { Source, Layer, Popup } from "react-map-gl";

import { Container, Col } from "reactstrap";

import { Paper, Box, Typography } from "@mui/material";

// import mapMessageData from "./processed_map_v4.json";
import type { CircleLayer, LayerProps, LineLayer } from "react-map-gl";
import ControlPanel from "./control-panel";
import MessageMonitorApi from "../../apis/mm-api";
import { useDashboardContext } from "../../contexts/dashboard-context";
import { Marker } from "mapbox-gl";
import { SidePanel } from "./side-panel";
import { CustomPopup } from "./popup";
import { useSession } from "next-auth/react";
import getConfig from "next/config";
import { generateColorDictionary, generateMapboxStyleExpression } from "./utilities/colors";
import { MapLegend } from "./map-legend";
const { publicRuntimeConfig } = getConfig();

const allInteractiveLayerIds = [
  "mapMessage",
  "connectingLanes",
  "connectingLanesYellow",
  "connectingLanesInactive",
  "connectingLanesMissing",
  "signalStatesGreen",
  "signalStatesYellow",
  "signalStatesRed",
  "bsm",
  "invalidLaneCollection",
];

const mapMessageLayer: LineLayer = {
  id: "mapMessage",
  type: "line",
  paint: {
    "line-width": 5,
    "line-color": ["case", ["==", ["get", "ingressPath"], true], "#eb34e8", "#0004ff"],
  },
};

const mapMessageHighlightLayer: LineLayer = {
  id: "mapMessageHighlight",
  type: "line",
  paint: {
    "line-width": 5,
    "line-color": "#fffc50",
  },
};

const connectingLanesLayer: LineLayer = {
  id: "connectingLanes",
  type: "line",
  paint: {
    "line-width": 5,
    "line-color": "#30af25",
    "line-dasharray": [2, 1],
  },
};

const connectingLanesLayerYellow: LineLayer = {
  id: "connectingLanesYellow",
  type: "line",
  paint: {
    "line-width": 5,
    "line-color": "#c5b800",
    "line-dasharray": [2, 1],
  },
};

const connectingLanesLayerInactive: LineLayer = {
  id: "connectingLanesInactive",
  type: "line",
  paint: {
    "line-width": 5,
    "line-color": "#da2f2f",
    "line-dasharray": [2, 1],
  },
};

const connectingLanesLayerMissing: LineLayer = {
  id: "connectingLanesMissing",
  type: "line",
  paint: {
    "line-width": 5,
    "line-color": "#000000",
    "line-dasharray": [2, 1],
  },
};

const connectingLanesHighlightLayer: LineLayer = {
  id: "connectingLanesHighlight",
  type: "line",
  paint: {
    "line-width": 5,
    "line-color": "#fffc50",
    "line-dasharray": [2, 1],
  },
};

const RED_LIGHT = "#FF0000";
const YELLOW_LIGHT = "#FFFF00";
const GREEN_LIGHT = "#187019";

const signalStateLayerGreen: LayerProps = {
  id: "signalStatesGreen",
  type: "symbol",
  layout: {
    "icon-image": "traffic-light-icon-green-1",
    "icon-allow-overlap": true,
    "icon-size": ["interpolate", ["linear"], ["zoom"], 0, 0, 6, 0.5, 9, 0.4, 22, 0.08],
  },
};

const signalStateLayerRed: LayerProps = {
  id: "signalStatesRed",
  type: "symbol",
  layout: {
    "icon-image": "traffic-light-icon-red-1",
    "icon-allow-overlap": true,
    "icon-size": ["interpolate", ["linear"], ["zoom"], 0, 0, 6, 0.5, 9, 0.4, 22, 0.08],
  },
};

const signalStateLayerYellow: LayerProps = {
  id: "signalStatesYellow",
  type: "symbol",
  layout: {
    "icon-image": "traffic-light-icon-yellow-1",
    "icon-allow-overlap": true,
    "icon-size": ["interpolate", ["linear"], ["zoom"], 0, 0, 6, 0.5, 9, 0.4, 22, 0.08],
  },
};

const bsmHighlightLayer: LayerProps = {
  id: "bsmHighlight",
  type: "circle",
  paint: {
    "circle-color": "#0000FF",
    "circle-radius": 8,
  },
};

const markerLayer: LayerProps = {
  id: "invalidLaneCollection",
  type: "line",
  paint: {
    "line-width": 20,
    "line-color": "#d40000",
    // "line-dasharray": [2, 1],
  },
};

const markerHighlightLayer: LayerProps = {
  id: "invalidLaneCollectionHighlight",
  type: "line",
  paint: {
    "line-width": 20,
    "line-color": "#fffc50",
    // "line-dasharray": [2, 1],
  },
};

const generateQueryParams = (notification: MessageMonitor.Notification | undefined) => {
  const startOffset = 1000 * 60 * 1;
  const endOffset = 1000 * 60 * 1;
  if (!notification) {
    return {
      startDate: new Date(Date.now() - startOffset),
      endDate: new Date(Date.now() + endOffset),
      eventDate: new Date(Date.now()),
      vehicleId: undefined,
    };
  } else {
    return {
      startDate: new Date(notification.notificationGeneratedAt - startOffset),
      endDate: new Date(notification.notificationGeneratedAt + endOffset),
      eventDate: new Date(notification.notificationGeneratedAt),
      vehicleId: undefined,
    };
  }
};

type MyProps = {
  notification: MessageMonitor.Notification | undefined;
};

const MapTab = (props: MyProps) => {
  const MAPBOX_API_TOKEN = publicRuntimeConfig.MAPBOX_TOKEN!;

  const [queryParams, setQueryParams] = useState<{
    startDate: Date;
    endDate: Date;
    eventDate: Date;
    vehicleId?: string;
  }>({
    startDate: new Date(Date.now() - 1000 * 60),
    endDate: new Date(Date.now() + 1000 * 60),
    eventDate: new Date(Date.now()),
    vehicleId: undefined,
  });

  const [mapLegendColors, setMapLegendColors] = useState<{
    bsmColors: { [key: string]: string };
    laneColors: { [key: string]: string };
    travelConnectionColors: { [key: string]: string };
  }>({
    bsmColors: { Other: "#0004ff" },
    laneColors: {
      Ingress: "#0004ff",
      Egress: "#eb34e8",
    },
    travelConnectionColors: {
      Green: "#30af25",
      Yellow: "#c5b800",
      Red: "#da2f2f",
      "No SPAT/Unknown": "#000000",
    },
  });

  const [bsmLayerStyle, setBsmLayerStyle] = useState<CircleLayer>({
    id: "bsm",
    type: "circle",
    paint: {
      "circle-color": ["match", ["get", "id"], "#0004ff"],
      "circle-radius": 8,
    },
  });

  const [mapData, setMapData] = useState<ProcessedMap>();
  const [mapSignalGroups, setMapSignalGroups] = useState<SignalStateFeatureCollection>();
  const [signalStateData, setSignalStateData] = useState<SignalStateFeatureCollection[]>();
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
  const { intersectionId: dbIntersectionId } = useDashboardContext();
  const [selectedFeature, setSelectedFeature] = useState<any>(undefined);
  const [rawData, setRawData] = useState({});
  const { data: session } = useSession();

  useEffect(() => {
    console.debug("SELECTED FEATURE", selectedFeature);
  }, [selectedFeature]);

  const parseMapSignalGroups = (mapMessage: ProcessedMap): SignalStateFeatureCollection => {
    const features: SignalStateFeature[] = [];

    console.log("Map Message");
    console.log(mapMessage);
    mapMessage?.mapFeatureCollection?.features?.forEach((mapFeature: MapFeature) => {
      if (!mapFeature.properties.ingressApproach || !mapFeature?.properties?.connectsTo?.[0]?.signalGroup) {
        return;
      }
      features.push({
        type: "Feature",
        properties: {
          signalGroup: mapFeature.properties.connectsTo[0].signalGroup,
          intersectionId: mapMessage.properties.intersectionId,
          color: "#FFFFFF",
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
        const connTravelNotification = notification as ConnectionOfTravelNotification;
        const connTravelAssessmentGroups = connTravelNotification.assessment.connectionOfTravelAssessment;
        connTravelAssessmentGroups?.forEach((assessmentGroup) => {
          const ingressLocation: number[] | undefined = connectingLanes.features.find(
            (connectingLaneFeature: MapFeature) => {
              return connectingLaneFeature.properties.laneId === assessmentGroup.ingressLaneID;
            }
          )?.geometry.coordinates[0];
          const egressLocation: number[] | undefined = connectingLanes.features.find(
            (connectingLaneFeature: MapFeature) => {
              return connectingLaneFeature.properties.laneId === assessmentGroup.egressLaneID;
            }
          )?.geometry.coordinates[0];
          if (!ingressLocation || !egressLocation) return;
          const marker = {
            type: "Feature",
            properties: {
              description: `${connTravelNotification.notificationText}, egress lane ${assessmentGroup.egressLaneID}, incress lane ${assessmentGroup.ingressLaneID}, connection ID ${assessmentGroup.connectionID}, event count ${assessmentGroup.eventCount}`,
              title: connTravelNotification.notificationType,
            },
            geometry: {
              type: "LineString",
              coordinates: [ingressLocation, egressLocation],
            },
          };
          markerCollection.features.push(marker);
        });
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

  const parseSignalStateToColor = (state?: SignalState): string => {
    switch (state) {
      case "STOP_AND_REMAIN":
        return RED_LIGHT; // red
      case "PROTECTED_CLEARANCE":
        return YELLOW_LIGHT; // yellow
      case "PROTECTED_MOVEMENT_ALLOWED":
        return GREEN_LIGHT; // green
      default:
        return "#FFFFFF";
    }
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
    console.debug("Ode Bsm Data");
    console.debug(bsmData);
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

  const filterConnections = (
    connectingLanes: ConnectingLanesFeatureCollection,
    signalGroups: SpatSignalGroup[],
    states: SignalState[]
  ): ConnectingLanesFeatureCollection => {
    return {
      ...connectingLanes,
      features: connectingLanes.features.filter((feature) => {
        const val: boolean =
          signalGroups.find(
            (signalGroup) =>
              signalGroup.signalGroup == feature.properties.signalGroupId && states.includes(signalGroup.state)
          ) !== undefined;
        return !val;
      }),
    };
  };

  const generateSignalStateFeatureCollection = (
    prevSignalStates: SignalStateFeatureCollection,
    signalGroups: SpatSignalGroup[]
  ): SignalStateFeatureCollection[] => {
    const red: SignalStateFeatureCollection = { ...prevSignalStates, features: [] };
    const yellow: SignalStateFeatureCollection = { ...prevSignalStates, features: [] };
    const green: SignalStateFeatureCollection = { ...prevSignalStates, features: [] };
    (prevSignalStates?.features ?? []).forEach((feature) => {
      feature.properties.color = parseSignalStateToColor(
        signalGroups?.find((signalGroup) => signalGroup.signalGroup == feature.properties.signalGroup)?.state
      );
      if (feature.properties.color == RED_LIGHT) red.features.push(feature);
      if (feature.properties.color == YELLOW_LIGHT) yellow.features.push(feature);
      if (feature.properties.color == GREEN_LIGHT) green.features.push(feature);
    });
    return [red, yellow, green];
  };

  //   useEffect(() => {
  //     setPointData(mapMessageData.mapFeatureCollection)
  //   }, []);

  const pullInitialData = async () => {
    if (!session?.accessToken || !dbIntersectionId) {
      return;
    }
    const rawMap: ProcessedMap[] = await MessageMonitorApi.getMapMessages({
      token: session?.accessToken,
      intersection_id: dbIntersectionId?.toString(),
      //startTime: new Date(queryParams.startDate.getTime() - 1000 * 60 * 60 * 1),
      //endTime: queryParams.endDate,
      latest: true,
    });
    if (!rawMap || rawMap.length == 0) {
      console.info("NO MAP MESSAGES WITHIN TIME");
      return;
    }
    const latestMapMessage: ProcessedMap = rawMap.at(-1)!;
    const mapSignalGroupsLocal = parseMapSignalGroups(latestMapMessage);
    setMapData(latestMapMessage);
    setMapSignalGroups(mapSignalGroupsLocal);
    if (latestMapMessage != null) {
      setViewState({
        latitude: latestMapMessage?.properties.refPoint.latitude,
        longitude: latestMapMessage?.properties.refPoint.longitude,
        zoom: 19,
      });
    } else {
      console.log("Cannot Zoom to Map Location");
    }

    setConnectingLanes(latestMapMessage.connectingLanesFeatureCollection);

    const rawSpat = await MessageMonitorApi.getSpatMessages({
      token: session?.accessToken,
      intersection_id: dbIntersectionId?.toString(),
      startTime: queryParams.startDate,
      endTime: queryParams.endDate,
    });

    const spatSignalGroupsLocal = parseSpatSignalGroups(rawSpat);

    setSpatSignalGroups(spatSignalGroupsLocal);

    const mapCoordinates: OdePosition3D = latestMapMessage?.properties.refPoint;
    const rawBsm = await MessageMonitorApi.getBsmMessages({
      token: session?.accessToken,
      vehicleId: queryParams.vehicleId,
      startTime: queryParams.startDate,
      endTime: queryParams.endDate,
      long: mapCoordinates.longitude,
      lat: mapCoordinates.latitude,
      distance: 500,
    });
    const bsmGeojson = parseBsmToGeojson(rawBsm);
    const uniqueIds = new Set(bsmGeojson.features.map((bsm) => bsm.properties?.id));
    console.log("BSM Data Unique IDs", uniqueIds);
    // generate equally spaced unique colors for each uniqueId
    const colors = generateColorDictionary(uniqueIds);
    setMapLegendColors((prevValue) => ({
      ...prevValue,
      bsmColors: colors,
    }));
    // add color to each feature
    const bsmLayerStyle = generateMapboxStyleExpression(colors);
    console.log("BSM Data", bsmLayerStyle);
    setBsmLayerStyle((prevValue) => {
      prevValue.paint!["circle-color"] = bsmLayerStyle;
      return prevValue;
    });
    console.debug("SETTING BSM LAYER STYLE");
    console.debug("SETTING BSM GEOJSON", bsmGeojson);
    setBsmData(bsmGeojson);

    setSliderValue(
      Math.min(
        getTimeRange(queryParams.startDate, queryParams.eventDate ?? new Date()),
        getTimeRange(queryParams.startDate, queryParams.endDate)
      )
    );

    rawData["map"] = rawMap;
    rawData["spat"] = rawSpat;
    rawData["bsm"] = rawBsm;
    rawData["notification"] = props.notification;
    setRawData(rawData);
  };

  useEffect(() => {
    const query_params = generateQueryParams(props.notification);
    setQueryParams(query_params);
    setTimeWindowSeconds(60);
  }, [props.notification]);

  useEffect(() => {
    pullInitialData();
  }, [queryParams, dbIntersectionId]);

  useEffect(() => {}, [sliderValue]);

  useEffect(() => {
    if (!mapSignalGroups || !spatSignalGroups) {
      return;
    }

    // retrieve filtered SPATs
    let closestSignalGroup: { spat: SpatSignalGroup[]; datetime: number } | null = null;
    for (const datetime in spatSignalGroups) {
      const datetimeNum = Number(datetime) / 1000;
      if (datetimeNum >= renderTimeInterval[0] && datetimeNum <= renderTimeInterval[1]) {
        if (
          closestSignalGroup === null ||
          Math.abs(datetimeNum - renderTimeInterval[0]) < Math.abs(closestSignalGroup.datetime - renderTimeInterval[0])
        ) {
          closestSignalGroup = { datetime: datetimeNum, spat: spatSignalGroups[datetime] };
        }
      }
    }
    if (closestSignalGroup !== null) {
      setCurrentSignalGroups(closestSignalGroup.spat);
      setSignalStateData(generateSignalStateFeatureCollection(mapSignalGroups, closestSignalGroup.spat));
    } else {
      setCurrentSignalGroups(undefined);
      setSignalStateData(undefined);
    }

    // retrieve filtered BSMs
    let start = performance.now();
    const filteredBsms: BsmFeature[] = [];
    (bsmData?.features ?? []).forEach((feature) => {
      if (
        feature.properties?.odeReceivedAt >= renderTimeInterval[0] &&
        feature.properties?.odeReceivedAt <= renderTimeInterval[1]
      ) {
        filteredBsms.push(feature);
      }
    });
    console.debug(performance.now() - start);
    console.debug("SETTING CURRENT BSMs");

    setCurrentBsms({ ...bsmData, features: filteredBsms });
  }, [mapSignalGroups, renderTimeInterval, spatSignalGroups]);

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
    downloadJsonFile(rawData["map"], `intersection_${dbIntersectionId}_MAP_data.json`);
    downloadJsonFile(rawData["spat"], `intersection_${dbIntersectionId}_SPAT_data.json`);
    downloadJsonFile(rawData["bsm"], `intersection_${dbIntersectionId}_BSM_data.json`);
    downloadJsonFile(rawData["notification"], `intersection_${dbIntersectionId}_Notification_data.json`);
  };

  const onTimeQueryChanged = (
    eventTime: Date = new Date(),
    timeBefore?: number,
    timeAfter?: number,
    timeWindowSeconds?: number
  ) => {
    console.log("onTimeQueryChanged", eventTime, timeBefore, timeAfter, timeWindowSeconds);

    const updatedQueryParams = {
      startDate: new Date(eventTime.getTime() - (timeBefore ?? 0) * 1000),
      endDate: new Date(eventTime.getTime() + (timeAfter ?? 0) * 1000),
      eventDate: eventTime,
    };
    if (
      queryParams.startDate.getTime() != updatedQueryParams.startDate.getTime() ||
      queryParams.endDate.getTime() != updatedQueryParams.endDate.getTime() ||
      queryParams.eventDate.getTime() != updatedQueryParams.eventDate.getTime()
    ) {
      // Detected change in query params
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
    console.debug("CLICKED", features, e);

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
            width: 1200,
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
                max={getTimeRange(queryParams.startDate, queryParams.endDate)}
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
          }}
        >
          <Box style={{ position: "relative" }}>
            <MapLegend
              bsmColors={mapLegendColors.bsmColors}
              laneColors={mapLegendColors.laneColors}
              travelConnectionColors={mapLegendColors.travelConnectionColors}
            />
          </Box>
        </div>

        <Map
          {...viewState}
          ref={mapRef}
          onLoad={() => {
            // const image = new Image(35, 35);
            // image.src = "./icons/traffic-light-green.svg";
            // mapRef.current.addImage("traffic_light_icon_green", image);
            // mapRef.current.loadImage(traffic_light_icon_green, (error, image) => {
            //   if (error) throw error;
            // });
          }}
          //   mapStyle="mapbox://styles/mapbox/satellite-streets-v12"
          mapStyle="mapbox://styles/tonyenglish/cld2bdrk3000201qmx2jb95kf"
          mapboxAccessToken={MAPBOX_API_TOKEN}
          attributionControl={true}
          customAttribution={['<a href="https://www.cotrip.com/" target="_blank">© CDOT</a>']}
          styleDiffing
          style={{ width: "100%", height: "100%" }}
          onMove={(evt) => setViewState(evt.viewState)}
          onClick={onClickMap}
          // onMouseDown={this.onMouseDown}
          // onMouseUp={this.onMouseUp}
          // interactiveLayerIds={interactiveLayerIds}
          // cursor={cursor}
          // onMouseEnter={() => this.setState({ cursor: "pointer" })}
          // onMouseLeave={() => this.setState({ cursor: "grab" })}
        >
          {/* {mapData && (
            <Source type="geojson" data={mapData?.connectingLanesFeatureCollection}>
              <Layer {...connectingLanesLayer} />
            </Source>
          )} */}
          {connectingLanes && currentSignalGroups && (
            <Source
              type="geojson"
              data={filterConnections(connectingLanes, currentSignalGroups, ["PROTECTED_MOVEMENT_ALLOWED"])}
            >
              <Layer {...connectingLanesLayer} />
            </Source>
          )}
          {connectingLanes && currentSignalGroups && (
            <Source
              type="geojson"
              data={filterConnections(connectingLanes, currentSignalGroups, [
                "PROTECTED_CLEARANCE",
                "PRE_MOVEMENT",
                "PERMISSIVE_MOVEMENT_ALLOWED",
                "PERMISSIVE_CLEARANCE",
                "STOP_THEN_PROCEED",
                "CAUTION_CONFLICTING_TRAFFIC",
              ])}
            >
              <Layer {...connectingLanesLayerYellow} />
            </Source>
          )}
          {connectingLanes && currentSignalGroups && (
            <Source type="geojson" data={filterConnections(connectingLanes, currentSignalGroups, ["STOP_AND_REMAIN"])}>
              <Layer {...connectingLanesLayerInactive} />
            </Source>
          )}
          {connectingLanes && currentSignalGroups && (
            <Source
              type="geojson"
              data={filterConnections(connectingLanes, currentSignalGroups, [null, "UNAVAILABLE", "DARK"])!}
            >
              <Layer {...connectingLanesLayerMissing} />
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
          {connectingLanes && currentSignalGroups && signalStateData && (
            <Source type="geojson" data={signalStateData[0]}>
              <Layer {...signalStateLayerRed} />
            </Source>
          )}
          {connectingLanes && currentSignalGroups && signalStateData && (
            <Source type="geojson" data={signalStateData[1]}>
              <Layer {...signalStateLayerYellow} />
            </Source>
          )}
          {connectingLanes && currentSignalGroups && signalStateData && (
            <Source type="geojson" data={signalStateData[2]}>
              <Layer {...signalStateLayerGreen} />
            </Source>
          )}
          {mapData && props.notification && (
            <Source
              type="geojson"
              data={createMarkerForNotification([0, 0], props.notification, mapData.mapFeatureCollection)}
            >
              <Layer {...markerLayer} />
            </Source>
          )}
          {selectedFeature && (
            <CustomPopup selectedFeature={selectedFeature} onClose={() => setSelectedFeature(undefined)} />
          )}
        </Map>
        <SidePanel
          laneInfo={connectingLanes}
          signalGroups={currentSignalGroups}
          bsms={currentBsms}
          notification={props.notification}
        />
      </Col>
    </Container>
  );
};

export default MapTab;
