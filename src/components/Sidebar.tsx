import { currentUser } from "@clerk/nextjs/server";
import React from "react";

async function Sidebar() {
  const authUser = await currentUser();
  return <div>Sidebar</div>;
}

export default Sidebar;
