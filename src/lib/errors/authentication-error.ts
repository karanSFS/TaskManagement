import { AppError } from "@/lib/errors/app-error"

export class AuthenticationError extends AppError {
  constructor(message = "Sign in to continue.") {
    super("UNAUTHORIZED", message, 401)
  }
}
