export type AdminSlotFormState = {
  status: "idle" | "success" | "error";
  message: string;
};

export const initialAdminSlotFormState: AdminSlotFormState = {
  status: "idle",
  message: ""
};
