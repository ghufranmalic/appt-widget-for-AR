import { useEffect, useState } from "react";
import type { ScheduleConfig } from "../types/schedule";
import { loadScheduleConfig } from "./scheduleConfig";

export function useScheduleConfig(): ScheduleConfig | null {
  const [config, setConfig] = useState<ScheduleConfig | null>(null);

  useEffect(() => {
    let active = true;

    loadScheduleConfig().then((loaded) => {
      if (active) {
        setConfig(loaded);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  return config;
}
