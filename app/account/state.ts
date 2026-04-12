export type AccountProfileState = {
  step: "edit" | "verify";
  status: "idle" | "success" | "error";
  message: string;
  currentName: string;
  currentPhone: string;
  pendingPhone: string;
  maskedPendingPhone: string;
  resendAvailableAt: string | null;
};

export const createInitialAccountProfileState = (
  name: string,
  phone: string
): AccountProfileState => ({
  step: "edit",
  status: "idle",
  message: "",
  currentName: name,
  currentPhone: phone,
  pendingPhone: "",
  maskedPendingPhone: "",
  resendAvailableAt: null
});
