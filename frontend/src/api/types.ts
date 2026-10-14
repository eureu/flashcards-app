export interface Actor {
  user_id: string;
  telegram_id: number;
  display_name: string;
}

export interface DomainErrorPayload {
  error: {
    code: string;
    message: string;
    details: Record<string, unknown>;
  };
}
