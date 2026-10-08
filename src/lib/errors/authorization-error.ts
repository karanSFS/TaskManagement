import { AppError } from "@/lib/errors/app-error"

export class AuthorizationError extends AppError {
  constructor(code: string, message: string) {
    super(code, message, 403)
  }
}
