import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listMaterials from "./tools/list-materials";
import myAccount from "./tools/my-account";

const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "dypol-labs",
  title: "DYPOL LABS",
  version: "0.1.0",
  instructions:
    "Tools for Dypol, a study resource site. Use `list_materials` to browse study materials and `get_my_account` for the user's exam target, Dio balance and bookmarks.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listMaterials, myAccount],
});
