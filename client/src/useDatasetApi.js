import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { createDatasetApi } from "./api";

export function useDatasetTag() {
  const { school, period, class: cls } = useParams();
  return { school, period, class: cls };
}

export function useDatasetApi() {
  const tag = useDatasetTag();
  return useMemo(() => createDatasetApi(tag), [tag.school, tag.period, tag.class]);
}
