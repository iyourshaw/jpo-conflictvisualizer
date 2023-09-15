import {
  Paper,
  Box,
  IconButton,
  Typography,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableBody,
  TableCell,
  Divider,
} from "@mui/material";

interface MapLegendPropsType {
  bsmColors: { [key: string]: string };
  laneColors: { [key: string]: string };
  travelConnectionColors: { [key: string]: string };
}

export const MapLegend = (props: MapLegendPropsType) => {
  const { bsmColors, laneColors, travelConnectionColors } = props;

  const bsmColorsList: JSX.Element[] = [];
  for (const [key, value] of Object.entries(bsmColors)) {
    bsmColorsList.push(
      <>
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            marginLeft: 5,
            marginRight: 10,
            minWidth: 110,
          }}
        >
          <div>{key}: </div>
          <div style={{ height: 20, width: 20, backgroundColor: value, marginLeft: "auto" }}></div>
        </div>
        <p>|</p>
      </>
    );
    console.log(key, value);
  }

  const travelConnectionColorsList: JSX.Element[] = [];
  for (const [key, value] of Object.entries(travelConnectionColors)) {
    travelConnectionColorsList.push(
      <>
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            marginLeft: 5,
            marginRight: 10,
            minWidth: 110,
          }}
        >
          <div>{key}: </div>
          <div style={{ height: 20, width: 20, backgroundColor: value, marginLeft: "auto" }}></div>
        </div>
        <p>|</p>
      </>
    );
    console.log(key, value);
  }

  const laneColorsList: JSX.Element[] = [];
  for (const [key, value] of Object.entries(laneColors)) {
    laneColorsList.push(
      <>
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            marginLeft: 5,
            marginRight: 10,
            minWidth: 110,
          }}
        >
          <div>{key}: </div>
          <div style={{ height: 20, width: 20, backgroundColor: value, marginLeft: "auto" }}></div>
        </div>
        <p>|</p>
      </>
    );
    console.log(key, value);
  }

  return (
    <Paper className="legend" style={{ userSelect: "none" }}>
      {/* <Tooltip title="Latest data timestamp received">
            <div style={{ fontFamily: "Arial Narrow" }}>{this.state.timestampFormat}</div>
          </Tooltip> */}

      <div style={{ display: "flex", flexDirection: "row" }}>
        <div style={{ display: "flex", flexDirection: "row", alignItems: "center", marginRight: 10, minWidth: 140 }}>
          <div>Lane Colors: </div>
        </div>
        {laneColorsList}
      </div>

      <Divider sx={{ borderRadius: 1 }} />

      <div style={{ display: "flex", flexDirection: "row" }}>
        <div style={{ display: "flex", flexDirection: "row", alignItems: "center", marginRight: 10, minWidth: 140 }}>
          <div>Travel Connections: </div>
        </div>
        {travelConnectionColorsList}
      </div>

      <Divider sx={{ borderRadius: 1 }} />

      <div style={{ display: "flex", flexDirection: "row" }}>
        <div style={{ display: "flex", flexDirection: "row", alignItems: "center", marginRight: 10, minWidth: 140 }}>
          <div>BSM Colors: </div>
        </div>
        {bsmColorsList}
      </div>
    </Paper>
  );
};
