import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/welcome")({
  ssr: false,
  component: Welcome,
});

// Legacy redirect — the real entry is /auth now.
function Welcome() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate({ to: "/auth", replace: true });
  }, [navigate]);
  return null;
}
