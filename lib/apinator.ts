import { Apinator } from "@apinator/server";

const apinator = new Apinator({
  appId: process.env.APINATOR_APP_ID!,
  key: process.env.NEXT_PUBLIC_APINATOR_KEY!,
  secret: process.env.APINATOR_SECRET_KEY!,
  cluster: process.env.NEXT_PUBLIC_APINATOR_CLUSTER ?? "us",
});

export default apinator;
