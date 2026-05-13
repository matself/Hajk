import type { ErrorRequestHandler } from "express";

interface ErrorPayload {
  message: string;
}

type HttpErrorLike = Error & {
  status?: number;
  errors?: ErrorPayload[];
};

const errorHandler: ErrorRequestHandler = (err, _req, res) => {
  const safeErr = err as HttpErrorLike;
  const errors = safeErr.errors ?? [{ message: safeErr.message }];
  res.status(safeErr.status ?? 500).json({ errors });
};

export default errorHandler;
