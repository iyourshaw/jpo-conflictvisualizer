import { useState, useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { Box, Container, Typography } from "@mui/material";
import { configParamApi } from "../../../apis/configuration-param-api";
import { DashboardLayout } from "../../../components/dashboard-layout";
import { ConfigParamEditForm } from "../../../components/configuration/configuration-edit-form";
import { useDashboardContext } from "../../../contexts/dashboard-context";
import { useSession } from "next-auth/react";

const ConfigParamEdit = () => {
  const { intersectionId, roadRegulatorId } = useDashboardContext();
  const [parameter, setParameter] = useState<Config | undefined>(undefined);
  const { data: session } = useSession();

  const router = useRouter();
  const { key } = router.query;

  const getParameter = async (key: string) => {
    if (session?.accessToken && intersectionId && roadRegulatorId) {
      try {
        const data = await configParamApi.getParameter(
          session?.accessToken,
          key,
          roadRegulatorId.toString(),
          intersectionId.toString()
        );

        setParameter(data);
      } catch (err) {
        console.error(err);
      }
    }
  };

  useEffect(() => {
    getParameter(key as string);
  }, [intersectionId]);

  if (!parameter) {
    return null;
  }

  return (
    <>
      <Head>
        <title>Parameter Edit</title>
      </Head>
      <Box
        component="main"
        sx={{
          backgroundColor: "background.default",
          flexGrow: 1,
          py: 8,
        }}
      >
        <Container maxWidth="md">
          <Box
            sx={{
              alignItems: "center",
              display: "flex",
              overflow: "hidden",
            }}
          >
            <div>
              <Typography noWrap variant="h4">
                {parameter.key}
              </Typography>
            </div>
          </Box>
          <Box mt={3}>
            <ConfigParamEditForm parameter={parameter} />
          </Box>
        </Container>
      </Box>
    </>
  );
};

ConfigParamEdit.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default ConfigParamEdit;
