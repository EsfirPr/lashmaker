export type MasterFormState = {
  status: "idle" | "success" | "error";
  message: string;
};

export const initialMasterFormState: MasterFormState = {
  status: "idle",
  message: ""
};
