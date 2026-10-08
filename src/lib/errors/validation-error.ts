import { AppError } from "@/lib/errors/app-error"

export class ValidationError extends AppError {
  constructor(message: string) {
    super("VALIDATION_ERROR", message, 422)
  }
}
