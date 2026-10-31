import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { createDatasetApi } from "./api";

export function useDatasetTag() {
  const { school, period, class: cls } = useParams();
  return { school, period, class: cls };
}

export function useDatasetApi() {
  const tag = useDatasetTag();
  // useDatasetTag() returns a fresh object every call, so depending on `tag`
  // itself would recompute (and break memoization for callers) every render;
  // depending on its primitive fields is the deliberate, narrower equivalent.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => createDatasetApi(tag), [tag.school, tag.period, tag.class]);
}
