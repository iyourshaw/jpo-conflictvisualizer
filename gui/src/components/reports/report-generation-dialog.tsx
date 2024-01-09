import React, { useState, useEffect } from "react";
import { Dialog, DialogTitle, Container, DialogActions, Button, Paper, Box, Typography } from "@mui/material";

import { useDashboardContext } from "../../contexts/dashboard-context";
import { ReportRequestEditForm } from "./report-request-edit-form";
import ReportsApi from "../../apis/reports-api";
import toast from "react-hot-toast";
import { useDispatch, useSelector } from "react-redux";
import { selectAuthToken } from "../../slices/userSlice";

type ReportGenerationDialogProps = {
  onClose: () => void;
  open: boolean;
};

export const ReportGenerationDialog = (props: ReportGenerationDialogProps) => {
  const { intersectionId } = useDashboardContext();
  const dispatch = useDispatch();

  const authToken = useSelector(selectAuthToken);

  const { onClose, open } = props;

  const handleClose = () => {
    onClose();
  };

  const getReport = async ({
    intersectionId,
    roadRegulatorId,
    startTime,
    endTime,
  }: {
    intersectionId?: number;
    roadRegulatorId?: number;
    startTime: Date;
    endTime: Date;
  }) => {
    if (authToken || !intersectionId || !roadRegulatorId) {
      console.error(
        "Did not attempt to generate report. Access token:",
        authToken,
        "Intersection ID:",
        intersectionId,
        "Road Regulator ID:",
        roadRegulatorId
      );
      return;
    }
    const promise = ReportsApi.generateReport({
      token: authToken,
      intersectionId,
      roadRegulatorId,
      startTime,
      endTime,
    });
    toast.promise(promise, {
      loading: "Generating Performance Report",
      success: "Successfully Generated Performance Report",
      error: "Error Generating Performance Report",
    });
    const report = await promise;
    const name = `Performance Report ${new Date().toISOString()}.pdf`;
    if (report !== undefined) {
      downloadPdf(report, name);
    }
  };

  const downloadPdf = (contents: Blob, name: string) => {
    const url = window.URL.createObjectURL(contents);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", name); //or any other extension
    document.body.appendChild(link);
    link.click();
  };

  return (
    <>
      <Dialog onClose={handleClose} open={open} fullWidth maxWidth={"lg"}>
        <DialogTitle>Generate Performance Report</DialogTitle>
        <Container>
          <ReportRequestEditForm onGenerateReport={getReport} dbIntersectionId={intersectionId} />
        </Container>
        <DialogActions>
          <Button autoFocus onClick={handleClose}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
