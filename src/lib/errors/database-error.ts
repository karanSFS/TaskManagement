import { AppError } from "@/lib/errors/app-error"

export class DatabaseError extends AppError {
  constructor(message = "Could not save your changes. Try again.") {
    super("DATABASE_ERROR", message, 500)
  }
}
