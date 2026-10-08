import { AppError } from "@/lib/errors/app-error"

export class NotFoundError extends AppError {
  constructor(code: string, message: string) {
    super(code, message, 404)
  }
}
