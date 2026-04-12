export type RegisterFlowState = {
  step: "register" | "verify";
  message: string;
  error: string;
  phone: string;
  maskedPhone: string;
  expiresAt: string | null;
  resendAvailableAt: string | null;
};

export const initialRegisterFlowState: RegisterFlowState = {
  step: "register",
  message: "",
  error: "",
  phone: "",
  maskedPhone: "",
  expiresAt: null,
  resendAvailableAt: null
};
