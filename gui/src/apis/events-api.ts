import { number } from "prop-types";
import { authApiHelper } from "./api-helper";

interface Item {
  label: string;
  value: string;
}

const EVENT_TYPES: Item[] = [
  { label: "ConnectionOfTravelEvent", value: "connection_of_travel" },
  { label: "IntersectionReferenceAlignmentEvent", value: "intersection_reference_alignment" },
  { label: "LaneDirectionOfTravelEvent", value: "lane_direction_of_travel" },
  //   { label: "ProcessingTimePeriod", value: "processing_time_period" },
  { label: "SignalGroupAlignmentEvent", value: "signal_group_alignment" },
  { label: "SignalStateConflictEvent", value: "signal_state_conflict" },
  { label: "SignalStateEvent", value: "signal_state" },
  { label: "SignalStateStopEvent", value: "signal_state_stop" },
  { label: "TimeChangeDetailsEvent", value: "time_change_details" },
  { label: "MapMinimumDataEvent", value: "map_minimum_data" },
  { label: "SpatMinimumDataEvent", value: "spat_minimum_data" },
  { label: "MapBroadcastRateEvent", value: "map_broadcast_rate" },
  { label: "SpatBroadcastRateEvent", value: "spat_broadcast_rate" },
];

class EventsApi {
  async getEvents(
    token: string,
    eventType: string,
    intersectionId: number,
    roadRegulatorId: number,
    startTime: Date,
    endTime: Date,
    { latest = false }: { latest?: boolean } = {}
  ): Promise<MessageMonitor.Event[]> {
    const queryParams = {
      intersection_id: intersectionId.toString(),
      road_regulator_id: roadRegulatorId.toString(),
      start_time_utc_millis: startTime.getTime().toString(),
      end_time_utc_millis: endTime.getTime().toString(),
      latest: latest.toString(),
    };
    // if (roadRegulatorId) queryParams["road_regulator_id"] = roadRegulatorId;

    const response = await authApiHelper.invokeApi({
      path: `/events/${eventType}`,
      token: token,
      queryParams: queryParams,
      failureMessage: `Failed to retrieve events of type ${eventType}`,
    });
    return response ?? ([] as MessageMonitor.Event[]);
  }

  async getAllEvents(
    token: string,
    intersectionId: number,
    roadRegulatorId: number,
    startTime: Date,
    endTime: Date
  ): Promise<MessageMonitor.Event[]> {
    const queryParams = {
      intersection_id: intersectionId.toString(),
      road_regulator_id: roadRegulatorId.toString(),
      start_time_utc_millis: startTime.getTime().toString(),
      end_time_utc_millis: endTime.getTime().toString(),
    };
    // if (roadRegulatorId) queryParams["road_regulator_id"] = roadRegulatorId;

    const events: MessageMonitor.Event[] = [];
    for (const eventTypeObj of EVENT_TYPES) {
      const response: MessageMonitor.Event[] =
        (await authApiHelper.invokeApi({
          path: `/events/${eventTypeObj.value}`,
          token: token,
          queryParams: queryParams,
          failureMessage: `Failed to retrieve events of type ${eventTypeObj.value}`,
        })) ?? [];
      events.push(...response);
    }
    return events;
  }
}

export default new EventsApi();
