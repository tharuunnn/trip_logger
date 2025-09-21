import { useCallback, useState } from "react";

export const useRefresh = () => {
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  return { refreshKey, refresh };
};
