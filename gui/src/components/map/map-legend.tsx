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
import MuiAccordion, { AccordionProps } from "@mui/material/Accordion";
import MuiAccordionSummary, { AccordionSummaryProps } from "@mui/material/AccordionSummary";
import MuiAccordionDetails from "@mui/material/AccordionDetails";
import ArrowForwardIosSharpIcon from "@mui/icons-material/ArrowForwardIosSharp";
import { styled } from "@mui/material/styles";
import trafficLightIconUnknown from "../../../public/icons/traffic-light-icon-unknown.svg";
import trafficLightIconRedFlashing from "../../../public/icons/traffic-light-icon-red-flashing.svg";
import trafficLightIconRed1 from "../../../public/icons/traffic-light-icon-red-1.svg";
import trafficLightIconYellowRed1 from "../../../public/icons/traffic-light-icon-yellow-red-1.svg";
import trafficLightIconYellow1 from "../../../public/icons/traffic-light-icon-yellow-1.svg";
import trafficLightIconGreen1 from "../../../public/icons/traffic-light-icon-green-1.svg";
import ScrollBar from "react-perfect-scrollbar";

// "DARK": "/icons/traffic-light-icon-unknown",
// "STOP_THEN_PROCEED": "/icons/traffic-light-icon-red-flashing",
// "STOP_AND_REMAIN": "/icons/traffic-light-icon-red-1",
// "PRE_MOVEMENT": "/icons/traffic-light-icon-yellow-red-1",
// "PERMISSIVE_MOVEMENT_ALLOWED": "/icons/traffic-light-icon-yellow-1",
// "PROTECTED_MOVEMENT_ALLOWED": "/icons/traffic-light-icon-green-1",
// "PERMISSIVE_CLEARANCE": "/icons/traffic-light-icon-yellow-1",
// "PROTECTED_CLEARANCE": "/icons/traffic-light-icon-yellow-1",
// "CAUTION_CONFLICTING_TRAFFIC": "/icons/traffic-light-icon-yellow-1",

const signalHeadIconsObj = {
  "traffic-light-icon-unknown": trafficLightIconUnknown,
  "traffic-light-icon-red-flashing": trafficLightIconRedFlashing,
  "traffic-light-icon-red-1": trafficLightIconRed1,
  "traffic-light-icon-yellow-red-1": trafficLightIconYellowRed1,
  "traffic-light-icon-yellow-1": trafficLightIconYellow1,
  "traffic-light-icon-green-1": trafficLightIconGreen1,
};

const Accordion = styled((props: AccordionProps) => <MuiAccordion disableGutters elevation={0} square {...props} />)(
  ({ theme }) => ({
    //border: `1px solid ${theme.palette.divider}`,
    // '&:not(:last-child)': {
    //   borderBottom: 0,
    // },
    // '&:before': {
    //   display: 'none',
    // },
  })
);

const AccordionSummary = styled((props: AccordionSummaryProps) => (
  <MuiAccordionSummary expandIcon={<ArrowForwardIosSharpIcon sx={{ fontSize: "0.8rem" }} />} {...props} />
))(({ theme }) => ({
  minHeight: 0,
  paddingLeft: 10,
  flexDirection: "row-reverse",
  "& .MuiAccordionSummary-expandIconWrapper.Mui-expanded": {
    transform: "rotate(90deg)",
  },
  "& .MuiAccordionSummary-content": {
    marginLeft: theme.spacing(1),
    marginTop: 0,
    marginBottom: 0,
  },
}));

const AccordionDetails = styled(MuiAccordionDetails)(({ theme }) => ({}));

interface MapLegendPropsType {
  bsmColors: { [key: string]: string };
  laneColors: { [key: string]: string };
  travelConnectionColors: { [key: string]: [string, number[]] };
  signalHeadIcons: { [key: string]: string };
}

export const MapLegend = (props: MapLegendPropsType) => {
  const { bsmColors, laneColors, travelConnectionColors, signalHeadIcons } = props;

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
            marginRight: 5,
          }}
        >
          <div style={{ fontSize: 12 }}>{key}: </div>
          <div style={{ height: 20, width: 20, backgroundColor: value, marginLeft: 2 }}></div>
        </div>
        <p>|</p>
      </>
    );
  }

  const travelConnectionColorsList: JSX.Element[] = [];
  for (const [key, value] of Object.entries(travelConnectionColors)) {
    const heightFactor = 20 / 2 / value[1].reduce((partialSum, a) => partialSum + a, 0); // 20 is the height of the colored bar, 2 is the number of sets of colors
    const heightColored = value[1][0] * heightFactor;
    const heightWhite = (value[1].length == 1 ? 0 : value[1][1]) * heightFactor;
    travelConnectionColorsList.push(
      <>
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            marginLeft: 5,
            marginRight: 5,
          }}
        >
          <div style={{ fontSize: 12 }}>{key}: </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ height: heightColored, width: 10, backgroundColor: value[0], marginLeft: 2 }}></div>
            <div style={{ height: heightWhite, width: 10, backgroundColor: "#ffffff", marginLeft: 2 }}></div>
            <div style={{ height: heightColored, width: 10, backgroundColor: value[0], marginLeft: 2 }}></div>
            <div style={{ height: heightWhite, width: 10, backgroundColor: "#ffffff", marginLeft: 2 }}></div>
          </div>
        </div>
        <p>|</p>
      </>
    );
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
            marginRight: 5,
          }}
        >
          <div style={{ fontSize: 12 }}>{key}: </div>
          <div style={{ height: 20, width: 20, backgroundColor: value, marginLeft: 2 }}></div>
          <div>|</div>
        </div>
      </>
    );
  }

  const signalHeadIconsList: JSX.Element[] = [];
  for (const [key, value] of Object.entries(signalHeadIcons)) {
    signalHeadIconsList.push(
      <>
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            marginLeft: 5,
            marginRight: 3,
          }}
        >
          <div style={{ fontSize: 12 }}>{key}: </div>
          <img src={value} style={{ height: 40, width: 30, marginLeft: 2 }}></img>
          <div>|</div>
        </div>
      </>
    );
  }

  return (
    <Accordion disableGutters defaultExpanded={false}>
      <AccordionSummary>
        <Typography variant="h5">Legend</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Paper className="legend" style={{ userSelect: "none" }}>
          <Accordion disableGutters defaultExpanded={true}>
            <AccordionSummary>
              <Typography variant="h5">Signal Heads</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <div style={{ display: "flex", flexDirection: "row", overflowX: "auto" }}>{signalHeadIconsList}</div>
            </AccordionDetails>
          </Accordion>

          <Divider sx={{ borderRadius: 1 }} />

          <Accordion disableGutters defaultExpanded={true}>
            <AccordionSummary>
              <Typography variant="h5">Lane Lines</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <div style={{ display: "flex", flexDirection: "row", overflowX: "auto" }}>{laneColorsList}</div>
            </AccordionDetails>
          </Accordion>

          <Divider sx={{ borderRadius: 1 }} />

          <Accordion disableGutters defaultExpanded={true}>
            <AccordionSummary>
              <Typography variant="h5">Lane Connections</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <div style={{ display: "flex", flexDirection: "row", overflowX: "auto" }}>
                {travelConnectionColorsList}
              </div>
            </AccordionDetails>
          </Accordion>

          <Accordion disableGutters defaultExpanded={true}>
            <AccordionSummary>
              <Typography variant="h5">BSM Colors</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <div style={{ display: "flex", flexDirection: "row", overflowX: "auto" }}>{bsmColorsList}</div>
            </AccordionDetails>
          </Accordion>

          <Divider sx={{ borderRadius: 1 }} />
        </Paper>
      </AccordionDetails>
    </Accordion>
  );
};
