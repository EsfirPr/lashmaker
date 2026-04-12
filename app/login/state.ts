export type LoginFlowState = {
  step: "request" | "verify";
  message: string;
  error: string;
  phone: string;
  maskedPhone: string;
  expiresAt: string | null;
  resendAvailableAt: string | null;
};

export const initialLoginFlowState: LoginFlowState = {
  step: "request",
  message: "",
  error: "",
  phone: "",
  maskedPhone: "",
  expiresAt: null,
  resendAvailableAt: null
};
