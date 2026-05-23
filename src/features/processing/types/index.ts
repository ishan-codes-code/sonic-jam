export type ProcessingSectionKey = "processing" | "completed" | "failed";

export type ProcessingSectionOption = {
  key: ProcessingSectionKey;
  label: string;
  count: number;
};
