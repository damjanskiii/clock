import { ClockApp } from "@/components/clock-app";

export default function UpdatePage() {
  return (
    <ClockApp
      apiPath="/api/update/clock"
      strictBoundarySwitch
      useViewportSizing
      variant="v2"
    />
  );
}
